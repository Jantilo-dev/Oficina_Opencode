import type { AgentInfo, AgentEvent, Bootstrap, ChatMessage, ChatPart, ModelInfo, Session } from "./types";

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error ?? `${url} -> HTTP ${res.status}`);
  }
  return data as T;
}

export async function fetchBootstrap(): Promise<Bootstrap> {
  return json<Bootstrap>("/api/bootstrap");
}

export async function fetchHealth(): Promise<{ upstream: boolean; opencode: string }> {
  return json<{ upstream: boolean; opencode: string }>("/api/health");
}

export async function fetchAgents(): Promise<AgentInfo[]> {
  const data = await json<{ agents: AgentInfo[] }>("/api/opencode/agents");
  return data.agents ?? [];
}

export async function fetchModels(): Promise<{ models: ModelInfo[]; defaults: Record<string, string> }> {
  return json<{ models: ModelInfo[]; defaults: Record<string, string> }>("/api/models");
}

export async function createSession(title: string): Promise<Session> {
  return json<Session>("/api/sessions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title })
  });
}

export async function promptSession(
  id: string,
  body: { text: string; agent?: string; model?: { providerID: string; modelID: string } }
): Promise<void> {
  await json(`/api/sessions/${encodeURIComponent(id)}/prompt`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

export async function abortSession(id: string): Promise<void> {
  await json(`/api/sessions/${encodeURIComponent(id)}/abort`, { method: "POST" });
}

export async function deleteSession(id: string): Promise<void> {
  await json(`/api/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function fetchMessages(id: string): Promise<ChatMessage[]> {
  const data = await json<{ messages: any[] }>(`/api/sessions/${encodeURIComponent(id)}/messages`);
  return normalizeMessages(data.messages);
}

export function normalizeMessages(raw: any[]): ChatMessage[] {
  const output: ChatMessage[] = [];
  for (const entry of raw ?? []) {
    const info = entry?.info;
    if (!info?.id) continue;
    const parts: ChatPart[] = [];
    for (const part of entry.parts ?? []) {
      if (part.type === "text") {
        parts.push({ id: part.id, type: "text", text: part.text ?? "" });
      } else if (part.type === "tool") {
        parts.push({
          id: part.id,
          type: "tool",
          tool: part.tool,
          status: part.state?.status,
          title: part.state?.title
        });
      }
    }
    const role: "user" | "assistant" = info.role === "user" ? "user" : "assistant";
    output.push({
      id: info.id,
      role,
      agent: role === "user" ? info.agent : undefined,
      model: role === "user" ? info.model?.modelID : info.modelID,
      provider: role === "user" ? info.model?.providerID : info.providerID,
      created: info.time?.created ?? 0,
      tokens:
        role === "assistant" && info.tokens
          ? (info.tokens.input ?? 0) + (info.tokens.output ?? 0) + (info.tokens.reasoning ?? 0)
          : undefined,
      cost: typeof info.cost === "number" ? info.cost : undefined,
      parts
    });
  }
  return output.sort((a, b) => a.created - b.created);
}

export function subscribe(
  onEvent: (event: AgentEvent) => void,
  onLink: (state: "live" | "reconnecting") => void
): () => void {
  const source = new EventSource("/api/events");
  source.onopen = () => onLink("live");
  source.onerror = () => onLink("reconnecting");
  source.onmessage = (message) => {
    try {
      const parsed = JSON.parse(message.data);
      onEvent((parsed.payload ?? parsed) as AgentEvent);
    } catch {
      /* ignore malformed frame */
    }
  };
  return () => source.close();
}
