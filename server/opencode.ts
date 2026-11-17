export function getBaseUrl(): string {
  return (process.env.OPENCODE_URL ?? "http://127.0.0.1:4096").replace(/\/+$/, "");
}

export class UpstreamError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "UpstreamError";
    this.status = status;
  }
}

export function upstreamHeaders(): Record<string, string> {
  const headers: Record<string, string> = { accept: "application/json" };
  const password = process.env.OPENCODE_SERVER_PASSWORD;
  if (password) {
    const user = process.env.OPENCODE_SERVER_USERNAME ?? "opencode";
    headers.authorization = `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
  }
  return headers;
}

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = 15000): Promise<T> {
  const headers: Record<string, string> = { ...upstreamHeaders() };
  if (init.body) headers["content-type"] = "application/json";
  Object.assign(headers, init.headers ?? {});

  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers,
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 300);
    } catch {
      /* ignore */
    }
    throw new UpstreamError(`${path} -> HTTP ${res.status}${detail ? `: ${detail}` : ""}`, res.status);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export type SessionInfo = {
  id: string;
  projectID: string;
  directory: string;
  parentID?: string;
  title: string;
  version: string;
  time: { created: number; updated: number };
};

export type SessionStatus =
  | { type: "idle" }
  | { type: "busy" }
  | { type: "retry"; attempt: number; message: string; next: number };

export type ProjectInfo = {
  id: string;
  worktree: string;
  vcs?: "git";
  time: { created: number; initialized?: number };
};

export type PathInfo = {
  home: string;
  state: string;
  config: string;
  worktree: string;
  directory: string;
};

export type SessionMeta = {
  agent?: string;
  model?: string;
  provider?: string;
  tokens?: number;
};

export type AgentInfo = {
  name: string;
  description?: string;
  mode: "primary" | "subagent" | "all";
  builtIn: boolean;
  model?: { providerID: string; modelID: string };
  permission?: {
    edit?: "ask" | "allow" | "deny";
    bash?: "ask" | "allow" | "deny";
    webfetch?: "ask" | "allow" | "deny";
  };
};

export type ModelInfo = {
  providerID: string;
  providerName: string;
  modelID: string;
  label: string;
};

export type Bootstrap = {
  directory: string;
  project: ProjectInfo | null;
  sessions: SessionInfo[];
  statuses: Record<string, SessionStatus>;
  meta: Record<string, SessionMeta>;
  fetchedAt: number;
};

let directoryCache: { value: string; at: number } | null = null;

export async function getDirectory(force = false): Promise<string> {
  if (!force && directoryCache && Date.now() - directoryCache.at < 5000) {
    return directoryCache.value;
  }
  const path = await request<PathInfo>("/path", {}, 5000);
  directoryCache = { value: path.directory, at: Date.now() };
  return path.directory;
}

export async function checkUpstream(): Promise<boolean> {
  try {
    await request<PathInfo>("/path", {}, 1500);
    return true;
  } catch {
    return false;
  }
}

type RawRule = { permission?: string; pattern?: string; action?: "ask" | "allow" | "deny" };

function lastAction(rules: unknown, permission: string): "ask" | "allow" | "deny" | undefined {
  if (!Array.isArray(rules)) return undefined;
  let result: "ask" | "allow" | "deny" | undefined;
  for (const rule of rules as RawRule[]) {
    if (rule?.permission === permission && rule.action) result = rule.action;
  }
  return result;
}

export async function listAgents(): Promise<AgentInfo[]> {
  const directory = await getDirectory();
  const raw = await request<any[]>(`/agent?directory=${encodeURIComponent(directory)}`);
  const agents: AgentInfo[] = (raw ?? []).map((agent) => ({
    name: String(agent.name ?? ""),
    description: agent.description ? String(agent.description) : undefined,
    mode: (agent.mode ?? "primary") as AgentInfo["mode"],
    builtIn: Boolean(agent.native ?? agent.builtIn ?? false),
    model: agent.model ?? undefined,
    permission: {
      edit: lastAction(agent.permission, "edit"),
      bash: lastAction(agent.permission, "bash"),
      webfetch: lastAction(agent.permission, "webfetch")
    }
  }));
  const order: Record<string, number> = { primary: 0, all: 1, subagent: 2 };
  return agents.sort((a, b) => {
    const byMode = (order[a.mode] ?? 9) - (order[b.mode] ?? 9);
    if (byMode !== 0) return byMode;
    return a.name.localeCompare(b.name);
  });
}

export async function listModels(): Promise<{ models: ModelInfo[]; defaults: Record<string, string> }> {
  const directory = await getDirectory();
  const data = await request<{ providers: any[]; default?: Record<string, string> }>(
    `/config/providers?directory=${encodeURIComponent(directory)}`
  );
  const models: ModelInfo[] = [];
  for (const provider of data.providers ?? []) {
    const providerID = String(provider.id ?? "");
    for (const [modelID, model] of Object.entries(provider.models ?? {})) {
      models.push({
        providerID,
        providerName: String(provider.name ?? providerID),
        modelID,
        label: String((model as any)?.name ?? modelID)
      });
    }
  }
  models.sort(
    (a, b) =>
      a.providerName.localeCompare(b.providerName) ||
      a.label.localeCompare(b.label)
  );
  return { models, defaults: data.default ?? {} };
}

export async function createSession(title: string): Promise<SessionInfo> {
  const directory = await getDirectory();
  return request<SessionInfo>(`/session?directory=${encodeURIComponent(directory)}`, {
    method: "POST",
    body: JSON.stringify({ title })
  });
}

export async function promptSession(options: {
  id: string;
  text: string;
  agent?: string;
  model?: { providerID: string; modelID: string };
}): Promise<void> {
  const directory = await getDirectory();
  await request<void>(`/session/${encodeURIComponent(options.id)}/prompt_async?directory=${encodeURIComponent(directory)}`, {
    method: "POST",
    body: JSON.stringify({
      ...(options.agent ? { agent: options.agent } : {}),
      ...(options.model ? { model: options.model } : {}),
      parts: [{ type: "text", text: options.text }]
    })
  });
}

export async function getMessages(id: string): Promise<any[]> {
  const directory = await getDirectory();
  return request<any[]>(`/session/${encodeURIComponent(id)}/message?directory=${encodeURIComponent(directory)}`);
}

export async function abortSession(id: string): Promise<void> {
  const directory = await getDirectory();
  await request<void>(`/session/${encodeURIComponent(id)}/abort?directory=${encodeURIComponent(directory)}`, {
    method: "POST"
  });
}

export async function deleteSession(id: string): Promise<void> {
  const directory = await getDirectory();
  await request<void>(`/session/${encodeURIComponent(id)}?directory=${encodeURIComponent(directory)}`, {
    method: "DELETE"
  });
}

async function fetchMeta(sessionID: string, query: string): Promise<SessionMeta | null> {
  const messages = await request<Array<{ info: any }>>(`/session/${encodeURIComponent(sessionID)}/message${query}`).catch(
    () => []
  );
  const meta: SessionMeta = {};
  for (const message of messages) {
    const info = message?.info;
    if (!info) continue;
    if (info.role === "user") {
      meta.agent = info.agent;
      meta.model = info.model?.modelID;
      meta.provider = info.model?.providerID;
    } else if (info.role === "assistant") {
      meta.model = info.modelID;
      meta.provider = info.providerID;
      meta.tokens =
        (info.tokens?.input ?? 0) + (info.tokens?.output ?? 0) + (info.tokens?.reasoning ?? 0);
    }
  }
  return Object.keys(meta).length > 0 ? meta : null;
}

export async function fetchBootstrap(): Promise<Bootstrap> {
  const [directory, project] = await Promise.all([
    getDirectory(true),
    request<ProjectInfo>("/project/current", {}, 5000).catch(() => null)
  ]);

  const query = `?directory=${encodeURIComponent(directory)}`;

  const [sessions, statuses] = await Promise.all([
    request<SessionInfo[]>(`/session${query}`).catch(() => []),
    request<Record<string, SessionStatus>>(`/session/status${query}`).catch(() => ({}))
  ]);

  const limited = sessions.slice(0, 40);
  const metas = await Promise.all(limited.map((session) => fetchMeta(session.id, query)));
  const meta: Record<string, SessionMeta> = {};
  limited.forEach((session, index) => {
    const value = metas[index];
    if (value) meta[session.id] = value;
  });

  return { directory, project, sessions, statuses, meta, fetchedAt: Date.now() };
}
