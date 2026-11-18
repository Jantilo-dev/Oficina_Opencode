# AGENTS.md — Oficina Opencode

Guía de trabajo para asistentes de IA (opencode, Claude Code, Codex, etc.) dentro
de este repositorio. El README es la guía para usuarios; este archivo es el
contexto técnico y las reglas del proyecto.

- Repo: https://github.com/Jantilo-dev/Oficina_Opencode
- Licencia: GPL-3.0-only, Copyright (C) 2026 Julio Antilo
- Idioma de la interfaz y de los textos visibles: español
- Idioma del código, nombres de variables y tipos: inglés

## 1. Qué es

Dashboard local en pixel art 2.5D donde cada personaje representa una sesión o
agente de opencode. Muestra estado, tarea, archivo y logs; permite crear sesiones,
enviar prompts y observar el trabajo en áreas de oficina.

Arquitectura:

```
opencode (127.0.0.1:4096)
   |  REST /path /session /session/status /session/{id}/message
   |  SSE  /global/event
   v
server/ (API propia, 127.0.0.1:5174)
   |  /api/bootstrap, /api/events, /api/agents/*
   v
web/ (React + Vite + Canvas 2D, 127.0.0.1:5180)
```

No hay backend remoto, ni telemetría, ni base de datos. Todo es local y el estado
de los agentes externos vive en memoria del proceso Node.

## 2. Inicio rápido

Requisitos: Node.js 20+ (probado con 24) y opencode instalado.

```powershell
git clone https://github.com/Jantilo-dev/Oficina_Opencode.git
cd Oficina_Opencode
npm install

# terminal 1: opencode en la carpeta que quieres monitorear
opencode --port 4096

# terminal 2
npm run dev
```

Abrir http://127.0.0.1:5180.

Variables de entorno (ver `.env.example`):

| Variable | Defecto | Uso |
|---|---|---|
| `BIND` | `127.0.0.1` | interfaz del servidor propio |
| `PORT` | `5174` | puerto de la API |
| `OPENCODE_URL` | `http://127.0.0.1:4096` | servidor de opencode |
| `OPENCODE_SERVER_PASSWORD` | vacío | Basic auth hacia opencode |
| `OPENCODE_SERVER_USERNAME` | `opencode` | usuario de Basic auth |

Puertos: `5180` web, `5174` API, `4096` opencode. No exponer ninguno fuera de
localhost.

## 3. Mapa del repositorio

```
server/
  index.ts      Rutas Express, proxy SSE, estáticos, arranque
  opencode.ts   Cliente REST de opencode: bootstrap, sesiones, agentes, modelos
  agents.ts     Registro en memoria de agentes externos + bus SSE
web/
  index.html
  src/
    main.tsx, App.tsx        Composición de la UI y estado global
    api.ts                   fetchBootstrap, sesiones, prompts, mensajes
    useAgentSync.ts          Hook SSE para agentes externos (batching por rAF)
    types.ts, format.ts, characters.ts
    characterSprite.ts      Sprite pixel-art compartido por escena y vista previa
    teamRoles.ts            Responsabilidades y handoff predefinidos por rol
    index.css, chat.css      Tema de la UI
    scene/
      sprites.ts             Escena 2.5D: áreas, muebles, chibis, burbujas, temas
      occupancy.ts           Puestos, spots, pausas y overflow
      navigation.ts          Rejilla A*, muros/muebles y puertas transitables
      OfficeCanvas.tsx       Asignación, movimiento, zoom/pan, hit-test
      AgentPanel.tsx         Panel retro de detalle por agente
    components/              NewSessionModal, TeamModal, ModelSelect, SessionChat, CharacterModal
    layout/LayoutEditor.tsx  Editor rompecabezas: piezas, muros/puertas, pan/zoom, JSON
    office/                  Implementación anterior (mantener tipos/preview)
scripts/
  probe.ts                   Prueba de humo con orquestador + 2 investigadores
  clean-demo.ts              Lista/borra sesiones demo
  shot*.mjs                  Capturas con Edge headless (playwright-core)
docs/preview.png             Captura usada por el README
```

Nota: `web/src/office/sprites.ts` solo se conserva por `ThemeName`; la vista previa de
personajes usa `scene/sprites.ts` + `characterSprite.ts`, igual que la escena.
`web/src/office/OfficeCanvas.tsx` y `office/layout.ts` son código anterior no importado
por la app actual.

## 4. Flujo de datos

1. `GET /api/bootstrap` consulta `/path` en opencode para obtener el directorio y
   devuelve sesiones, estados y metadatos de ese directorio.
2. El navegador se suscribe a `/api/events`, que reenvía el SSE `/global/event` de
   opencode (proxy con reintento).
3. `App.tsx` reduce esos eventos a sesiones, estados, actividad, permisos, errores,
   diffs y transcripciones.
4. Los agentes externos llegan por `POST /api/agents/report`; `useAgentSync` los
   recibe vía `GET /api/agents/stream` y actualiza el estado por frame.
5. `App.tsx` fusiona sesiones raíz y subagentes activos de opencode (`oc:<id>`) y
   agentes externos (`live:<agentId>`) en `SceneAgent[]` para la escena. Los
   subagentes históricos inactivos no se muestran.
6. Los eventos SSE se filtran por directorio: `session.created/updated` usan
   `info.directory` y el resto se descarta si la sesión no pertenece al directorio
   cargado.
7. `/api/bootstrap` se reintenta con backoff y al volver a la pestaña. Los metadatos
   se piden solo para raíces y subagentes activos/recientes, se cachean 30 s y se
   consultan con concurrencia 6.
8. `CREAR EQUIPO` (`TeamModal` + `createTeam` en `App.tsx`) elige área, método
   Plan/Build y modelo por rol. Crea las cinco sesiones, las asigna a
   Planificación/Frontend/Backend/QA/Documentación y solo lanza el prompt del jefe;
   las otras cuatro quedan idle hasta **PASAR PLAN**. Las sesiones sin asignación usan
   primero las oficinas inferiores para no ocupar los puestos de equipo.

Mapeo de estados de opencode a la escena:

| Señal de opencode | Estado de escena |
|---|---|
| `session.status = busy` + tool `edit/write/patch/multiedit` | `coding` |
| `session.status = busy` + tool `bash/shell` | `running_tool` |
| `session.status = busy/retry` con otra tool | `thinking` |
| `permission.updated` | `thinking` |
| `session.error` | `error` |
| `idle` | `idle` |

## 5. API del servidor

| Método y ruta | Descripción |
|---|---|
| `GET /api/health` | estado de la app y de opencode (`upstream`) |
| `GET /api/bootstrap` | directorio, sesiones, estados y metadatos |
| `GET /api/layout` | layout guardado en `layout.json` |
| `PUT /api/layout` | guardar layout del editor |
| `GET /api/events` | proxy SSE de `/global/event` |
| `GET /api/opencode/agents` | agentes/tipos de opencode (modal de nueva sesión) |
| `GET /api/models` | proveedores y modelos disponibles |
| `POST /api/sessions` | crear sesión `{title}` |
| `POST /api/sessions/:id/prompt` | enviar instrucción `{text, agent?, model?}` |
| `GET /api/sessions/:id/messages` | historial de mensajes |
| `POST /api/sessions/:id/abort` | detener la ejecución |
| `DELETE /api/sessions/:id` | borrar sesión e hijos |
| `GET /api/agents` | snapshot de agentes externos |
| `POST /api/agents/report` | reportar estado de un agente |
| `GET /api/agents/stream` | SSE `snapshot`, `updated`, `removed` |
| `DELETE /api/agents/:id` | eliminar agente externo |

Estados admitidos: `idle`, `thinking`, `coding`, `running_tool`, `talking`,
`error`.

Ejemplo de reporte:

```powershell
curl.exe -X POST http://127.0.0.1:5174/api/agents/report `
  -H "Content-Type: application/json" `
  -d "{\"agentId\":\"ana\",\"name\":\"Ana\",\"status\":\"coding\",\"currentTask\":\"Refactor de auth\",\"file\":\"src/auth.ts\",\"log\":\"editando auth.ts\"}"
```

## 6. Escena y reglas visuales

- Pixel art 2.5D, bordes oscuros, `imageSmoothingEnabled = false` y
  `image-rendering: pixelated`.
- Suelo de ladrillo según tema; pared superior con ventanas, calendario y puertas
  de cristal. Pasillos verticales arriba y red de pasillos verticales y
  horizontales en la planta baja. La sala de reuniones tiene una sola puerta; las
  escaleras al final de los corredores superiores y en el pasillo bajan a la planta
  baja.
- Áreas superiores: **AREA INTRANET**, **AREA LOGÍSTICA**, **AREA SOPORTE** y
  **AREA PORTAL** (cinco puestos cada una: **PLANIFICACIÓN (JEFE)**, **FRONTEND**,
  **BACKEND**, **QA** y **DOCUMENTACIÓN**), **SALA DE REUNIONES**, **COCINA**,
  **PASILLO** (entrada y recepción) y **BAÑO** dividido en **HOMBRES** y
  **MUJERES** (3 cabinas por fila y lado, lavabos y muro divisorio).
- Planta baja: **GERENCIA**, **OFICINA 2**, **OFICINA 3**, **OFICINA 4**,
  **OFICINA 5** y **OFICINA 6**. Cada oficina tiene dos cubículos y **una sola
  puerta** hacia el corredor.
- `WORKSTATIONS` (32) combina `CUBICLES` (20 superiores, 5 por área) y `CUBICLES2`
  (12 en las seis oficinas), todos con el mismo diseño de escritorio. `SEATS` en
  `occupancy.ts` es la fuente para asignar puestos.
- `idle` con puesto se queda sentado y sale a pausas programadas (café, agua,
  baño); los agentes sin puesto esperan en pasillo/corredor o en overflow.
- Los baños usan spots con `gender`; los agentes entran por la puerta y el lado
  que corresponde a su género.
- `talking` → puestos únicos en la sala de reuniones con burbuja compartida.
- El manager (`managerId`) ocupa `MANAGER_SEAT`, el primer puesto de GERENCIA. Solo
  `plan` y `build` son elegibles (`MANAGER_AGENTS` en `App.tsx`); desde el detalle de
  una sesión elegible se puede pulsar **HACER MANAGER** para cambiarlo.
- Los puestos se asignan por sesión con el selector **puesto** del detalle
  (`SEAT_OPTIONS` en `occupancy.ts`); `App.tsx` guarda `seatAssignments` en
  `localStorage` (`pixel-office-seats`) y `OfficeCanvas` aplica el cambio emitiendo
  `onSeatsChange`. La cabecera **PAUSAS** desactiva las pausas idle.
- Cada área superior tiene un jefe en **PLANIFICACIÓN** y cuatro destinos,
  **FRONTEND**, **BACKEND**, **QA** y **DOCUMENTACIÓN**. El botón **PASAR PLAN** de
  `SessionChat` envía el último texto del asistente del jefe a las sesiones ocupantes
  de los otros cuatro puestos del área. Cuando los cinco puestos están ocupados por
  sesiones de opencode, el equipo queda fijado: `OfficeCanvas` fuerza el puesto,
  bloquea pausas/meetings y el selector de puesto se deshabilita.
- `teamRoles.ts` define la responsabilidad de cada rol (Jefe divide; Frontend UI/botones;
  Backend lógica/API; QA pruebas; Documentación docs/Scrum). El jefe recibe la orden de
  resolver dudas y dividir el plan; cada respuesta suya debe cerrar con
  `LISTO PARA PASAR AL EQUIPO: SÍ/NO` y **PASAR PLAN** inyecta el brief del rol en cada
  destino. Al quedar idle los cuatro destinos y sus subagentes, el jefe publica
  `JEFE_DONE_TEXT`.
- `App.tsx` detecta equipos completos por los títulos `AREA · ROL`, restaura sus puestos
  recomendados si se perdieron, los fija y obtiene los 4 destinos de `PASAR PLAN` desde
  esa detección. `intended` (método/modelo) se persiste en
  `pixel-office-intended`; si falta, los roles no-jefe usan `build`.
- Los subagentes se asignan al equipo siguiendo `parentID` hasta la raíz y se fuerza su
  modelo a `opencode-go/deepseek-v4.1-flash`, también si llegan después del equipo.
- `navigation.ts` construye una rejilla de 6 px, bloquea muros (respetando las
  puertas), muebles y escritorios, y calcula rutas A*; los personajes solo cruzan
  por huecos de puerta y se mueven por pasillos.
- `drawUpperAisles` pinta los pasillos internos de cada área superior (banda entre
  filas, laterales, central y borde inferior) con el color de corredor del tema.
- La recepción del PASILLO tiene puerta de entrada en la pared derecha y una
  recepcionista fija (`drawReception` + `RECEPTION_DESK`), que no depende de
  opencode.
- El canvas se escala en modo **cover** (llena la pantalla). Rueda del ratón y
  botones **+/−** hacen zoom, arrastrar hace pan, **AJUSTAR** encuadra todo y
  **LLENAR** vuelve a cubrir. El espacio libre se dibuja como zona
  **EN REPARACIÓN** con franjas de obra.
- Pantallas y LEDs se encienden mientras el puesto está ocupado (agente sentado)
  y se apagan cuando se levanta o el puesto queda vacío; apagadas quedan oscuras
  con LED rojo.
- Manos en teclado y ratón; teclas y ratón animados solo al `coding`/`running_tool`,
  nunca en idle. Los agentes sentados se dibujan de frente con la mirada baja hacia el
  monitor, con `seatX + 12` para quedar centrados en el teclado; brazos y manos se
  dibujan después del escritorio, para que alcancen teclado/ratón. El cuerpo se dibuja
  antes de los cubículos para que el escritorio oculte la parte inferior.
- Género: `CharacterParts.gender` o derivado del id; por defecto las mujeres usan
  pelo largo y falda al estar de pie, los hombres pelo corto y pantalón.
- Burbujas: puntos (thinking), monitor (coding), terminal (running_tool), taza
  (idle), diálogo (talking), `!` (error).
- `SessionChat` muestra una línea animada mientras el agente trabaja:
  **Pensando**, **Revisando archivos**, **Editando archivos**, **Ejecutando
  comando**, **Esperando permiso** o **Reintentando**; el estado de escena se marca
  `busy` de forma optimista al enviar el prompt. La cabecera fija muestra título,
  `id`, `padre` y `estado`; no se desplaza con los mensajes y solo cambia al elegir
  otra sesión.
- Mientras el estado es `thinking/coding/running_tool/error`, `OfficeCanvas` fuerza
  el puesto y cancela pausas/reuniones: el personaje no se levanta hasta quedar idle.
- `ErrorBox` detecta el error de región de OpenCode Go, muestra un enlace directo a la
  configuración de privacidad/regiones y, si existe el mismo modelo en el proveedor
  regional `opencode`, ofrece **Usar modelo regional**. También detecta **Insufficient
  balance** y enlaza a facturación; `opencode` se marca “pago por uso” y `opencode-go`
  “Go · región Global”. Con un equipo seleccionado ofrece **Usar OpenCode Go en el
  equipo**, que cambia cada miembro al equivalente Go. El error completo se toma de
  `error.data.message`/`info.error`, también en el chat.
- Personajes: `CharacterLook.parts` (pelo, ropa, piel, accesorio) y la galería se
  dibujan en los chibis; las imágenes propias se aceptan como `data:`, `blob:` o
  ruta local y se cachean.
- Temas: `SCENE_PALETTES` aplica FUEGO/RUBÍ/ESMERALDA a suelo, paredes, paneles y
  pasillos; el tema llega desde `App.tsx` a `drawScene`.
- El arte es procedural. **No** añadir sprites, logos ni personajes con copyright.

## 7. Convenciones

- TypeScript estricto; no usar `any` nuevo sin motivo. `npm run typecheck` debe
  pasar siempre.
- No añadir comentarios obvios ni explicaciones dentro del código; nombres claros.
- UI y textos para el usuario en español; identificadores en inglés.
- **Codificación UTF-8 obligatoria** (acentos, tildes y `Ñ`/`ñ`): todo fichero de
  texto se guarda en UTF-8 **sin BOM** y con saltos **LF** (`.editorconfig` y
  `.gitattributes` lo fijan). Al escribir código/README nunca usar en PowerShell 5.1
  `Get-Content`/`Set-Content`/`Add-Content` sin encoding sobre ficheros con
  acentos: re-codifican el UTF-8 como ANSI y rompen los acentos (doble codificación).
  Usar las herramientas de edición del agente, o `[IO.File]::ReadAllText`/`WriteAllText`
  con `New-Object Text.UTF8Encoding($false)`. Comprobar con `npm run check:encoding`
  (falla ante BOM, CRLF, UTF-8 inválido o doble codificación).
- Sin telemetría, sin CDN, sin assets externos, sin servicio remoto.
- Bind a `127.0.0.1`. No abrir puertos a la red.
- Commits estilo Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`,
  `chore:`.
- No versionar `node_modules`, `dist`, `.env`, logs, `demo/`, capturas de trabajo
  (`screenshot*.png`, `crop*.png`).
- Licencia GPL-3.0-only: cualquier derivado distribuido debe mantener la misma
  licencia y el aviso de copyright.

## 8. Comandos

```powershell
npm run dev          # API + web con recarga
npm run dev:api      # solo API (tsx watch)
npm run dev:web      # solo Vite
npm run typecheck    # tsc --noEmit
npm run check:encoding # UTF-8 sin BOM/CRLF y sin acentos rotos
npm run build        # typecheck + vite build + API a dist/server
npm run build:server # compila solo la API a dist/server
npm start            # sirve dist/web desde la API compilada
npm run probe        # prueba con orquestador + 2 investigadores
npm run clean-demo   # lista sesiones demo
npm run clean-demo -- --yes  # borra sesiones demo
node scripts/shot.mjs <url> <png>  # captura con Edge
```

## 9. Verificación

Antes de cada commit:

```powershell
npm run check:encoding
npm run typecheck
npm run build
```

CI (`.github/workflows/ci.yml`) ejecuta `npm ci`, `check:encoding`, `typecheck` y
`build` en cada push y PR a `main`.

Para probar la escena sin depender de opencode:

```powershell
curl.exe -X POST http://127.0.0.1:5174/api/agents/report -H "Content-Type: application/json" -d "{\"agentId\":\"ana\",\"name\":\"Ana\",\"status\":\"coding\"}"
curl.exe -X POST http://127.0.0.1:5174/api/agents/report -H "Content-Type: application/json" -d "{\"agentId\":\"ana\",\"status\":\"idle\"}"
```

Los agentes externos son efímeros: se pierden al reiniciar el servidor.

## 10. Recetas

- **Añadir un área**: crear su bloque en `drawRooms`/`drawScene`, añadir la etiqueta
  a `AREAS`, y colocar sus puestos en `WORKSTATIONS`.
- **Añadir un escritorio**: agregar un `Cubicle` a `CUBICLES` o `CUBICLES2` y
  reconstruir `WORKSTATIONS`; `SEATS` y `screenStates` se derivan de ahí. Si se
  añade una zona nueva, actualizar también `navigation.ts` (muros, puertas y
  muebles).
- **Cambiar destinos**: editar `CAFE_SPOTS`, `BREAK_SPOTS`, `MEETING_SPOTS` o
  `STANDING_SPOTS` en `occupancy.ts`.
- **Nuevo estado**: ampliar `SceneStatus` y `drawBubble`, y mapearlo en `App.tsx`.
- **Nuevo endpoint**: añadir en `server/index.ts`; si toca opencode, encapsular en
  `server/opencode.ts`.
- **Pausas**: `idle` con mesa sale según hash; ajustar `firstBreakDelay`,
  `nextBreakDelay`, `breakDuration` o `maxBreakers` en `occupancy.ts`.
- **Tema**: ampliar `SCENE_PALETTES` en `scene/sprites.ts` y el tipo `ThemeName` en
  `office/sprites.ts`.
- **Manager**: editar `MANAGER_AGENTS` en `App.tsx` o usar **HACER MANAGER** en el
  detalle de una sesión `plan`/`build`.
- **Puesto**: elegir en el selector del detalle; **AUTO** elimina la asignación
  guardada. Las etiquetas salen de `SEAT_OPTIONS` en `occupancy.ts`.
- **Equipo**: usar **CREAR EQUIPO**; `TeamModal` elige método y modelo por rol y
  `createTeam` solo lanza el prompt del jefe. El método/modelo de una sesión también
  se puede cambiar en el detalle de **EQUIPO**.
- **Traspaso**: asignar jefe/Frontend/Backend/QA/Documentación en un área y pulsar
  **PASAR PLAN** desde el chat del jefe; `runHandoff` en `App.tsx` envía el último
  texto del asistente a las otras cuatro sesiones.
- **Personaje**: ampliar `CharacterParts`/`LOOK_PRESETS` (incluido `gender`) y su
  dibujo en `drawChibiSeated`/`drawChibiStanding`.
- **Zoom/pan**: `zoomRef`, `panRef` y `baseViewRef` en `OfficeCanvas.tsx`; los
  botones **AJUSTAR** y **LLENAR** viven en el mismo componente.

## 11. Límites conocidos

- Los agentes externos viven en memoria; no se persisten.
- La planta tiene 32 puestos. A partir de ahí los agentes esperan de pie en el
  pasillo o en la rejilla de overflow.
- El editor de layout (`EDITAR OFICINA`) guarda y exporta piezas, pero todavía no
  alimenta la navegación/equipos en vivo; esa integración es la siguiente fase.
- Las sesiones mostradas pertenecen al directorio donde corre `opencode serve`.
- No hay terminal embebido (PTY) en la UI actual.
- El proxy SSE reintenta si opencode se cae; el aviso aparece en la cabecera.
- Las capturas y logs de desarrollo no se versionan.

## 12. Seguridad

- La app puede crear sesiones y enviar prompts; los agentes actúan con sus propios
  permisos. Para demos, usar agentes de solo lectura (`investigador`).
- `POST /api/agents/report` solo guarda estado; no ejecuta nada.
- No exponer `5174`, `5180` ni `4096` a redes no confiables.
- Ver `SECURITY.md` para el canal de reporte de vulnerabilidades.
