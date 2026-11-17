import express from "express";
import type { Response } from "express";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  UpstreamError,
  abortSession,
  checkUpstream,
  createSession,
  deleteSession,
  fetchBootstrap,
  getBaseUrl,
  getMessages,
  listAgents,
  listModels,
  promptSession,
  upstreamHeaders
} from "./opencode.js";
import {
  isAgentStatus,
  listAgents as listLiveAgents,
  removeAgent,
  reportAgent,
  subscribeAgents
} from "./agents.js";

const BIND = process.env.BIND ?? "127.0.0.1";
const PORT = Number(process.env.PORT ?? 5174);
const BASE = getBaseUrl();

const app = express();
app.use(express.json({ limit: "64kb" }));

const SESSION_ID = /^ses_[A-Za-z0-9]+$/;

function fail(res: Response, error: unknown) {
  if (error instanceof UpstreamError) {
    const status = error.status >= 400 && error.status < 600 ? error.status : 502;
    res.status(status).json({ error: error.message });
    return;
  }
  res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
}

function readText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length === 0 || text.length > max) return null;
  return text;
}

app.get("/api/health", async (_req, res) => {
  const upstream = await checkUpstream();
  res.json({ ok: true, opencode: BASE, upstream, bind: BIND, port: PORT });
});

app.get("/api/bootstrap", async (_req, res) => {
  try {
    res.json(await fetchBootstrap());
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/opencode/agents", async (_req, res) => {
  try {
    res.json({ agents: await listAgents() });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/agents", (_req, res) => {
  res.json({ agents: listLiveAgents() });
});

app.post("/api/agents/report", (req, res) => {
  const body = req.body ?? {};
  const agentId = typeof body.agentId === "string" ? body.agentId.trim() : "";
  if (!agentId || agentId.length > 80) {
    res.status(400).json({ error: "agentId requerido" });
    return;
  }
  if (!isAgentStatus(body.status)) {
    res.status(400).json({ error: "status inválido" });
    return;
  }
  const agent = reportAgent({
    agentId,
    name: typeof body.name === "string" ? body.name.slice(0, 60) : undefined,
    status: body.status,
    currentTask: typeof body.currentTask === "string" ? body.currentTask.slice(0, 300) : undefined,
    file: typeof body.file === "string" ? body.file.slice(0, 200) : undefined,
    log: typeof body.log === "string" ? body.log.slice(0, 500) : undefined,
    logs: Array.isArray(body.logs)
      ? body.logs
          .filter((item: unknown): item is string => typeof item === "string")
          .slice(0, 20)
          .map((item: string) => item.slice(0, 500))
      : undefined
  });
  res.json({ ok: true, agent });
});

app.delete("/api/agents/:id", (req, res) => {
  res.json({ ok: removeAgent(req.params.id) });
});

app.get("/api/agents/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  res.write(": connected\n\n");

  const send = (event: unknown) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };
  const unsubscribe = subscribeAgents(send);
  const keepAlive = setInterval(() => res.write(": ping\n\n"), 15000);

  req.on("close", () => {
    clearInterval(keepAlive);
    unsubscribe();
    res.end();
  });
});

app.get("/api/models", async (_req, res) => {
  try {
    res.json(await listModels());
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sessions", async (req, res) => {
  try {
    const title = readText(req.body?.title, 120) ?? `Sesión ${new Date().toISOString().slice(11, 19)}`;
    res.json(await createSession(title));
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sessions/:id/prompt", async (req, res) => {
  try {
    const { id } = req.params;
    if (!SESSION_ID.test(id)) {
      res.status(400).json({ error: "id de sesión inválido" });
      return;
    }
    const text = readText(req.body?.text, 8000);
    if (!text) {
      res.status(400).json({ error: "texto vacío o demasiado largo (máx. 8000)" });
      return;
    }
    const agent = typeof req.body?.agent === "string" && req.body.agent.length <= 80 ? req.body.agent : undefined;
    const rawModel = req.body?.model;
    const model =
      rawModel && typeof rawModel.providerID === "string" && typeof rawModel.modelID === "string"
        ? { providerID: rawModel.providerID.slice(0, 120), modelID: rawModel.modelID.slice(0, 160) }
        : undefined;

    await promptSession({ id, text, agent, model });
    res.json({ ok: true });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/sessions/:id/messages", async (req, res) => {
  try {
    const { id } = req.params;
    if (!SESSION_ID.test(id)) {
      res.status(400).json({ error: "id de sesión inválido" });
      return;
    }
    res.json({ messages: await getMessages(id) });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/sessions/:id/abort", async (req, res) => {
  try {
    const { id } = req.params;
    if (!SESSION_ID.test(id)) {
      res.status(400).json({ error: "id de sesión inválido" });
      return;
    }
    await abortSession(id);
    res.json({ ok: true });
  } catch (error) {
    fail(res, error);
  }
});

app.delete("/api/sessions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!SESSION_ID.test(id)) {
      res.status(400).json({ error: "id de sesión inválido" });
      return;
    }
    await deleteSession(id);
    res.json({ ok: true });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  res.write(": connected\n\n");

  let closed = false;
  let retryDelay = 1000;
  const controller = new AbortController();

  const safeWrite = (chunk: string): boolean => {
    if (closed) return false;
    try {
      res.write(chunk);
      return true;
    } catch {
      closed = true;
      return false;
    }
  };

  const close = () => {
    if (closed) return;
    closed = true;
    controller.abort();
  };
  req.on("close", close);
  res.on("close", close);

  const run = async () => {
    while (!closed) {
      try {
        const upstream = await fetch(`${BASE}/global/event`, {
          headers: { ...upstreamHeaders(), accept: "text/event-stream" },
          signal: controller.signal
        });
        if (!upstream.ok || !upstream.body) {
          throw new Error(`upstream HTTP ${upstream.status}`);
        }
        retryDelay = 1000;
        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        while (!closed) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value && !safeWrite(decoder.decode(value, { stream: true }))) break;
        }
        try {
          await reader.cancel();
        } catch {
          /* ignore */
        }
      } catch {
        if (closed) break;
        if (!safeWrite(": upstream retry\n\n")) break;
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        retryDelay = Math.min(8000, retryDelay * 2);
      }
    }
    try {
      res.end();
    } catch {
      /* ignore */
    }
  };

  void run();
});

const webDist = join(process.cwd(), "dist", "web");
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get("*", (_req, res) => res.sendFile(join(webDist, "index.html")));
}

app.listen(PORT, BIND, () => {
  console.log(`pixel-office api on http://${BIND}:${PORT} -> ${BASE}`);
});
