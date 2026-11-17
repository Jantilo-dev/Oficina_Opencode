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
      sprites.ts             Escena 2.5D: áreas, muebles, chibis, burbujas
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
- Suelo de ladrillo azul; pared superior con ventanas, calendario y puertas de
  cristal. Pasillos verticales claros entre columnas.
- Áreas: **AREA INTRANET**, **AREA LOGÍSTICA**, **AREA SOPORTE**, **AREA PORTAL**
  (dos escritorios cada una), **SALA DE REUNIONES**, **COCINA**, **BAÑO · 12**
  (12 cabinas y lavabos) y **PASILLO**.
- `CUBICLES` (8) define escritorios; `CAFE_SPOTS` y `HALL_SPOTS` definen destinos.
  Cada sesión toma un cubículo; si sobran, van a café/pasillo.
- `idle` → café; `talking` → sala de reuniones/pasillo con burbuja compartida.
- Pantallas y LEDs se encienden solo si el agente está sentado y trabajando; al
  levantarse quedan en standby.
- Manos en teclado y ratón; teclas y ratón animados al `coding`; mano a la barbilla
  al `thinking`.
- Burbujas: puntos (thinking), monitor (coding), terminal (running_tool), taza
  (idle), diálogo (talking), `!` (error).
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
  a `AREAS`, y colocar sus cubículos en `CUBICLES`.
- **Añadir un escritorio**: agregar entrada a `CUBICLES` (x, y, w, h, seatX,
  seatY) dentro del área y ampliar `screenStates` si hace falta.
- **Cambiar destinos**: editar `CAFE_SPOTS` (cocina) o `HALL_SPOTS` (reuniones/
  pasillo).
- **Nuevo estado**: ampliar `SceneStatus` y `drawBubble`, y mapearlo en `App.tsx`.
- **Nuevo endpoint**: añadir en `server/index.ts`; si toca opencode, encapsular en
  `server/opencode.ts`.
- **Café/agua**: los `idle` caminan a `CAFE_SPOTS`; las pantallas de su cubículo
  se apagan automáticamente.

## 11. Límites conocidos

- Los agentes externos viven en memoria; no se persisten.
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
