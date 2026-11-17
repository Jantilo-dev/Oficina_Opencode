# Pixel Office for opencode

[![CI](https://github.com/Jantilo-dev/Oficina_Opencode/actions/workflows/ci.yml/badge.svg)](https://github.com/Jantilo-dev/Oficina_Opencode/actions/workflows/ci.yml)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

![Oficina Opencode](docs/preview.png)

A tiny pixel-art office for **opencode**: it mirrors sessions and subagents in real
time, and lets you create sessions and chat with them from the browser. Local only,
no telemetry.

```
opencode (serve, 127.0.0.1:4096)
   |  SSE /global/event  +  REST /session, /session/status
   v
pixel-office API (127.0.0.1:5174)  ->  browser SPA (canvas)
```

## Requirements

- Node.js 20+ (tested on 24)
- opencode running as a server on a fixed port

## Run

```powershell
git clone https://github.com/Jantilo-dev/Oficina_Opencode.git
cd Oficina_Opencode
npm install

# terminal 1: opencode with a fixed port (or use `opencode serve --port 4096`)
opencode --port 4096

# terminal 2
npm run dev
```

Open <http://127.0.0.1:5180>.

If your opencode server is somewhere else, set `OPENCODE_URL` before starting the API:

```powershell
$env:OPENCODE_URL = "http://127.0.0.1:4096"
$env:PORT = "5174"
npm run dev
```

If your opencode server uses Basic auth, set `OPENCODE_SERVER_PASSWORD` (and
optionally `OPENCODE_SERVER_USERNAME`, default `opencode`); the proxy forwards it.

For a production build served by the API itself:

```powershell
npm run build
npm run build:server
npm start
```

`npm start` serves `dist/web` from the API on `127.0.0.1:5174`.

## What you see

- A floor plan inspired by a classic cubicle office: carpet, white walls, an
  entrance and **reception** in the hall, four upper work areas, a conference room,
  kitchen, corridors, split **bathrooms** and **six lower offices**.
- The upper floor has eight cubicles. The lower floor has **GERENCIA, OFICINA 2,
  OFICINA 3, OFICINA 4, OFICINA 5 and OFICINA 6**, each with two cubicles and a
  single door, for **20 seats total**. The manager (`orquestador`/`plan`/`build`)
  takes one GERENCIA desk, and a fixed receptionist works at the hall entrance.
- Agents walk along the corridors and through the doors (pathfinding with the floor
  walls and furniture as obstacles); they no longer cross walls.
- Idle agents stay seated at their desks and occasionally get up for coffee, water or
  the bathroom. Bathrooms are split into **HOMBRES** and **MUJERES**, and agents use
  the side that matches their gender. Add `?breaks=fast` (or `?breaks=demo`) to
  preview that sooner; `?nobreaks` disables breaks.
- New sessions walk in from the entrance to their desk.
- The floor fills the screen (cover). Use the mouse wheel or the **+/−** buttons to
  zoom, drag to pan, **AJUSTAR** to see the whole floor and **LLENAR** to fill the
  screen again. The empty area is drawn as an "EN REPARACIÓN" construction zone.
- Activity from `message.part.updated`: `edit`/`write` types, `read`/`grep` reads, `bash` runs a terminal.
- Bubbles for permission requests (`!`), errors (`x`) and retries.
- Right panel with two tabs: **EQUIPO** (sessions, agent, status, details) and
  **SESIÓN** (chat with the selected session).

## Create sessions and chat

- `+ NUEVA SESIÓN` opens a modal: pick an agent (primary or subagent), an optional
  model, a title and the first instruction.
- Each agent card shows its `edit` and `bash` permissions, so you know what it may do.
- The session appears on the floor (it walks in) and opens in **SESIÓN**, with
  streaming text, tool chips, tokens/cost, an input to keep talking, **Abortar**
  while it works and **Eliminar** (also removes its subagents).
- Several sessions run in parallel, each with its own context and desk.

## API endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | app + upstream status |
| `GET /api/bootstrap` | directory, sessions, statuses, agent/model metadata |
| `GET /api/events` | SSE proxy of opencode `/global/event` |
| `GET /api/opencode/agents` | opencode agents with mode and permissions |
| `GET /api/agents` | snapshot of external live agents |
| `GET /api/agents/stream` | SSE of external live agents |
| `GET /api/models` | provider/model list |
| `POST /api/sessions` | create a session |
| `POST /api/sessions/:id/prompt` | send an instruction (`agent`, `model?`, `text`) |
| `GET /api/sessions/:id/messages` | message history |
| `POST /api/sessions/:id/abort` | stop the current run |
| `DELETE /api/sessions/:id` | delete the session and its children |

## Themes

The header button cycles three palettes: **FUEGO**, **RUBÍ** and **ESMERALDA**.
The palette is applied to both the UI and the office (carpet, walls, panels and
corridors). The choice is saved in `localStorage`; `?theme=rubi` or
`?theme=esmeralda` in the URL picks one directly.

## Characters: names and avatars

In the **SESIÓN** tab press the pencil (✎) next to the title:

- **Nombre del personaje**: shown on the nameplate, the zone sign and the list.
- **Diseño personalizado**: hair style (short/long/twin/spiky), accessory
  (glasses/headband/cape/star), hair/shirt colours and skin tone, with a live preview.
  The same parts are drawn on the character in the office.
- **Galería**: nine original archetypes (Original, Ninja, Idol, Científico, Héroe,
  Samurái, Maga, Piloto, Gótico). They are rendered as presets in the scene.
- **Imagen propia**: PNG/JPG/WEBP/GIF/SVG up to 256 KB. Image avatars can be data,
  blob or local paths; remote URLs are ignored by the scene.
- Everything is stored in `localStorage` per session and removed when you delete it.

The project ships **no copyrighted characters** (no JJK, Pokémon, Miku, etc.). The
editor pieces are generic; if you upload your own images, use material you have the
rights to.

## Verify the event pipeline

```powershell
npm run probe
```

It creates a session with the `orquestador` agent, asks for two parallel `investigador`
subagents over `demo/`, and prints the events it observes.

## Security

- Binds to `127.0.0.1` only.
- It is a local control surface: it can create sessions and prompt agents, and
  agents act with their own permissions (edit files, run commands). Use read-only
  agents such as `investigador` for demos.
- No shell from the browser: the app only calls opencode with the chosen agent.
- No external assets, no CDN, no analytics.
- The opencode URL stays on the server; the browser only talks to this app.

## Clean the demo sessions

The probe creates sessions titled Oficina demo plus its subagents. To remove
them from this project (they are only demo data):

```powershell
npm run clean-demo          # lists them, deletes nothing
npm run clean-demo -- --yes  # deletes them
```

## Agent bridge (external reports)

Any local process or OpenCode hook can report its state to the dashboard.

`POST /api/agents/report`

```json
{
  "agentId": "ana",
  "name": "Ana",
  "status": "coding",
  "currentTask": "Refactor de autenticaci�n",
  "file": "src/auth.ts",
  "log": "editando auth.ts"
}
```

Statuses: `idle`, `thinking`, `coding`, `running_tool`, `talking`, `error`.

```powershell
curl.exe -X POST http://127.0.0.1:5174/api/agents/report `
  -H "Content-Type: application/json" `
  -d "{\"agentId\":\"ana\",\"name\":\"Ana\",\"status\":\"coding\",\"currentTask\":\"Refactor\",\"file\":\"src/auth.ts\",\"log\":\"editando auth.ts\"}"

curl.exe http://127.0.0.1:5174/api/agents
curl.exe -X DELETE http://127.0.0.1:5174/api/agents/ana
```

- `GET /api/agents` snapshot
- `GET /api/agents/stream` SSE (`snapshot`, `updated`, `removed`)
- `web/src/useAgentSync.ts` consumes the stream and batches updates per animation frame.
- OpenCode sessions are merged into the same scene automatically.
## Scene style

- 2.5D pixel art: dark-outlined sprites, no smoothing, extruded partitions,
  desks and chairs with front faces and shadows.
- Monitors and notebooks face the occupant (you see their backs and a glowing
  screen edge), not the camera.
- Status bubbles: `...` thinking, lit monitor coding, terminal running_tool,
  cup idle, speech talking, `!` error.
- Idle agents stay at their desks and take breaks at the café; `talking` agents
  meet in the meeting room.
## Areas

The floor is split into named rooms:

- AREA INTRANET, AREA LOGÍSTICA, AREA SOPORTE, AREA PORTAL (two cubicles each)
- SALA DE REUNIONES (talking agents meet here)
- COCINA (coffee, water, vending and table; agents come here on breaks)
- BAÑO split into HOMBRES and MUJERES (stalls, sinks and a dividing wall)
- PASILLO connecting the rooms, with reception and entrance door
- GERENCIA, OFICINA 2, OFICINA 3, OFICINA 4, OFICINA 5 and OFICINA 6 (two
  cubicles and one door each) on the lower floor

Desks keep their own monitor, keyboard, mouse and screen state. Seated agents rest
their hands on the keyboard and mouse; while coding they type and move the mouse.
A monitor turns on while its seat is occupied and turns off when the agent leaves;
off screens are dark with a red LED. Characters have a gender and use long hair
and/or a skirt when female.
## License

GPL-3.0-only. Copyright (C) 2026 Julio Antilo. See [LICENSE](LICENSE).