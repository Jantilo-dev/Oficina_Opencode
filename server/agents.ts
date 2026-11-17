export type AgentStatus =
  | "idle"
  | "thinking"
  | "coding"
  | "running_tool"
  | "talking"
  | "error";

export const AGENT_STATUSES: AgentStatus[] = [
  "idle",
  "thinking",
  "coding",
  "running_tool",
  "talking",
  "error"
];

export type AgentLog = { ts: number; message: string };

export type AgentState = {
  agentId: string;
  name: string;
  status: AgentStatus;
  currentTask?: string;
  file?: string;
  logs: AgentLog[];
  createdAt: number;
  updatedAt: number;
};

type AgentEvent =
  | { type: "snapshot"; agents: AgentState[] }
  | { type: "updated"; agent: AgentState }
  | { type: "removed"; agentId: string };

const MAX_LOGS = 60;
const agents = new Map<string, AgentState>();
const listeners = new Set<(event: AgentEvent) => void>();

function broadcast(event: AgentEvent) {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      /* ignore broken listeners */
    }
  }
}

export function isAgentStatus(value: unknown): value is AgentStatus {
  return typeof value === "string" && (AGENT_STATUSES as string[]).includes(value);
}

export function listAgents(): AgentState[] {
  return [...agents.values()].sort((a, b) => a.createdAt - b.createdAt);
}

export function getAgent(agentId: string): AgentState | undefined {
  return agents.get(agentId);
}

export function removeAgent(agentId: string): boolean {
  const removed = agents.delete(agentId);
  if (removed) broadcast({ type: "removed", agentId });
  return removed;
}

export function clearAgents(): void {
  for (const agentId of [...agents.keys()]) removeAgent(agentId);
}

export function reportAgent(input: {
  agentId: string;
  name?: string;
  status: AgentStatus;
  currentTask?: string;
  file?: string;
  log?: string;
  logs?: string[];
}): AgentState {
  const now = Date.now();
  const previous = agents.get(input.agentId);
  const messages = [
    ...(Array.isArray(input.logs) ? input.logs : []),
    ...(typeof input.log === "string" ? [input.log] : [])
  ]
    .filter((message) => typeof message === "string" && message.trim().length > 0)
    .map((message) => ({ ts: now, message: message.trim() }));

  const logs = [...(previous?.logs ?? []), ...messages].slice(-MAX_LOGS);

  const agent: AgentState = {
    agentId: input.agentId,
    name: input.name?.trim() || previous?.name || input.agentId,
    status: input.status,
    currentTask: input.currentTask ?? previous?.currentTask,
    file: input.file ?? previous?.file,
    logs,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now
  };

  agents.set(agent.agentId, agent);
  broadcast({ type: "updated", agent });
  return agent;
}

export function subscribeAgents(listener: (event: AgentEvent) => void): () => void {
  listeners.add(listener);
  listener({ type: "snapshot", agents: listAgents() });
  return () => listeners.delete(listener);
}
