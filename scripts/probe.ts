import { getBaseUrl } from "../server/opencode.js";

const base = getBaseUrl();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type SessionLike = { id: string; parentID?: string; title: string };

async function main() {
  let up = false;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${base}/session/status`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        up = true;
        break;
      }
    } catch {
      /* retry */
    }
    await sleep(500);
  }
  if (!up) throw new Error(`opencode server not reachable at ${base}`);
  console.log(`opencode up at ${base}`);

  const created = await fetch(`${base}/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Oficina demo" })
  });
  if (!created.ok) throw new Error(`create session: HTTP ${created.status} ${await created.text()}`);
  const session = (await created.json()) as SessionLike;
  console.log(`session: ${session.id}`);

  const text =
    `Prueba de humo visual. En la carpeta ${process.cwd()}\\demo hay dos archivos. ` +
    "Lanza exactamente 2 subagentes investigador en paralelo, uno por archivo, en un solo mensaje, " +
    "para describir el contenido de cada uno. Responde en 6 lineas maximo con la palabra clave de cada archivo.";

  const prompted = await fetch(`${base}/session/${session.id}/prompt_async`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ agent: "orquestador", parts: [{ type: "text", text }] })
  });
  console.log(`prompt_async: HTTP ${prompted.status}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 150000);
  const stream = await fetch(`${base}/global/event`, {
    headers: { accept: "text/event-stream" },
    signal: controller.signal
  });
  if (!stream.ok || !stream.body) throw new Error(`event stream: HTTP ${stream.status}`);

  const reader = stream.body.getReader();
  const decoder = new TextDecoder();
  const children = new Set<string>();
  const seen = new Set<string>();
  let buffer = "";
  let count = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let index: number;
      while ((index = buffer.indexOf("\n\n")) >= 0) {
        const block = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        for (const line of block.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim();
          if (!raw) continue;
          let parsed: { payload?: any; type?: string };
          try {
            parsed = JSON.parse(raw);
          } catch {
            continue;
          }
          const ev = parsed.payload ?? parsed;
          const type = ev.type as string;
          count++;
          if (type === "session.created" || type === "session.updated") {
            const info = ev.properties.info as SessionLike;
            const key = `${type}:${info.id}:${info.parentID ?? ""}`;
            if (!seen.has(key)) {
              seen.add(key);
              if (info.parentID) children.add(info.id);
              console.log(
                `[${type}] id=${info.id.slice(0, 12)} parent=${
                  info.parentID ? info.parentID.slice(0, 12) : "-"
                } title=${JSON.stringify(info.title).slice(0, 60)}`
              );
            }
          } else if (type === "session.status") {
            console.log(`[status] ${String(ev.properties.sessionID).slice(0, 12)} -> ${ev.properties.status.type}`);
          } else if (type === "message.part.updated") {
            const part = ev.properties.part;
            if (part?.type === "tool") {
              console.log(`[tool] ${String(part.sessionID).slice(0, 12)} ${part.tool} ${part.state?.status}`);
            }
          } else if (type === "permission.updated") {
            console.log(`[permission] ${String(ev.properties.sessionID).slice(0, 12)} ${ev.properties.title}`);
          }
        }
      }
      if (children.size >= 2) {
        console.log(`children detected: ${children.size}`);
        break;
      }
    }
  } finally {
    clearTimeout(timer);
    try {
      await reader.cancel();
    } catch {
      /* ignore */
    }
  }

  console.log(`done: session=${session.id} events=${count} children=${children.size}`);
  if (children.size < 2) process.exitCode = 2;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
