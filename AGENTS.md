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
    index.css, chat.css      Tema de la UI
    scene/
      sprites.ts             Escena 2.5D: áreas, muebles, chibis, burbujas, temas
      occupancy.ts           Puestos, spots, pausas y overflow
      navigation.ts          Rejilla A*, muros/muebles y puertas transitables
      OfficeCanvas.tsx       Asignación, movimiento, hit-test, escala
      AgentPanel.tsx         Panel retro de detalle por agente
    components/              NewSessionModal, SessionChat, CharacterModal
    office/                  Implementación anterior (mantener tipos/preview)
scripts/
  probe.ts                   Prueba de humo con orquestador + 2 investigadores
  clean-demo.ts              Lista/borra sesiones demo
  shot*.mjs                  Capturas con Edge headless (playwright-core)
docs/preview.png             Captura usada por el README
```

Nota: `web/src/office/sprites.ts` sigue usándose para `ThemeName` y la vista
previa de personajes; `web/src/office/OfficeCanvas.tsx` y `office/layout.ts` son
código anterior no importado por la app actual.

## 4. Flujo de datos

1. `GET /api/bootstrap` consulta `/path` en opencode para obtener el directorio y
   devuelve sesiones, estados y metadatos de ese directorio.
2. El navegador se suscribe a `/api/events`, que reenvía el SSE `/global/event` de
   opencode (proxy con reintento).
3. `App.tsx` reduce esos eventos a sesiones, estados, actividad, permisos, errores,
   diffs y transcripciones.
4. Los agentes externos llegan por `POST /api/agents/report`; `useAgentSync` los
   recibe vía `GET /api/agents/stream` y actualiza el estado por frame.
5. `App.tsx` fusiona sesiones de opencode (`oc:<id>`) y agentes externos
   (`live:<agentId>`) en `SceneAgent[]` para la escena.
6. Los eventos SSE se filtran por directorio: `session.created/updated` usan
   `info.directory` y el resto se descarta si la sesión no pertenece al directorio
   cargado.
7. `/api/bootstrap` se reintenta con backoff, al recuperar el SSE y al volver a la
   pestaña. Los metadatos de sesión se cachean 30 s y se piden con concurrencia 6.

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
  de cristal. Pasillos verticales claros entre columnas.
- Áreas superiores: **AREA INTRANET**, **AREA LOGÍSTICA**, **AREA SOPORTE**,
  **AREA PORTAL** (dos cubículos cada una), **SALA DE REUNIONES**, **COCINA**,
  **PASILLO** (entrada y recepción) y **BAÑO** dividido en **HOMBRES** y
  **MUJERES** (3 cabinas por fila y lado, lavabos y muro divisorio).
- Planta baja: **GERENCIA**, **OFICINA 2**, **OFICINA 3**, **OFICINA 4**,
  **OFICINA 5** y **OFICINA 6**. Cada oficina mide 380×230, tiene dos cubículos y
  **una sola puerta** hacia el pasillo.
- `WORKSTATIONS` (20) combina `CUBICLES` (8 superiores) y `CUBICLES2` (12 en las
  seis oficinas), todos con el mismo diseño de escritorio. `SEATS` en
  `occupancy.ts` es la fuente para asignar puestos.
- `idle` con puesto se queda sentado y sale a pausas programadas (café, agua,
  baño); los agentes sin puesto esperan en pasillo/corredor o en overflow.
- Los baños usan spots con `gender`; los agentes entran por la puerta y el lado
  que corresponde a su género.
- `talking` → puestos únicos en la sala de reuniones con burbuja compartida.
- El manager (`managerId`) ocupa `MANAGER_SEAT`, el primer puesto de GERENCIA.
- `navigation.ts` construye una rejilla de 6 px, bloquea muros (respetando las
  puertas), muebles y escritorios, y calcula rutas A*; los personajes solo cruzan
  por huecos de puerta y se mueven por pasillos.
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
- Manos en teclado y ratón; teclas y ratón animados al `coding`; mano a la barbilla
  al `thinking`.
- Género: `CharacterParts.gender` o derivado del id; las mujeres usan pelo largo y
  falda, los hombres pelo corto y pantalón.
- Burbujas: puntos (thinking), monitor (coding), terminal (running_tool), taza
  (idle), diálogo (talking), `!` (error).
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
npm run build        # typecheck + vite build
npm run build:server # compila la API a dist/server
npm start            # sirve dist/web desde la API compilada
npm run probe        # prueba con orquestador + 2 investigadores
npm run clean-demo   # lista sesiones demo
npm run clean-demo -- --yes  # borra sesiones demo
node scripts/shot.mjs <url> <png>  # captura con Edge
```

## 9. Verificación

Antes de cada commit:

```powershell
npm run typecheck
npm run build
```

CI (`.github/workflows/ci.yml`) ejecuta `npm ci`, `typecheck` y `build` en cada
push y PR a `main`.

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
- **Tema**: ampliar `SCENE_PALETTES` y el tipo `ThemeName` en `office/sprites.ts`.
- **Personaje**: ampliar `CharacterParts`/`LOOK_PRESETS` y su dibujo en
  `drawChibiSeated`/`drawChibiStanding`.

## 11. Límites conocidos

- Los agentes externos viven en memoria; no se persisten.
- La planta tiene 20 puestos. A partir de ahí los agentes esperan de pie en el
  pasillo o en la rejilla de overflow.
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
