import { useEffect, useRef, useState } from "react";

export type SyncStatus = "idle" | "thinking" | "coding" | "running_tool" | "talking" | "error";

export type AgentLog = { ts: number; message: string };

export type SyncAgent = {
  agentId: string;
  name: string;
  status: SyncStatus;
  currentTask?: string;
  file?: string;
  logs: AgentLog[];
  createdAt: number;
  updatedAt: number;
};

type AgentEvent =
  | { type: "snapshot"; agents: SyncAgent[] }
  | { type: "updated"; agent: SyncAgent }
  | { type: "removed"; agentId: string };

export function useAgentSync() {
  const [agents, setAgents] = useState<SyncAgent[]>([]);
  const [connected, setConnected] = useState(false);
  const bufferRef = useRef(new Map<string, SyncAgent>());
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const schedule = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        setAgents([...bufferRef.current.values()].sort((a, b) => a.createdAt - b.createdAt));
      });
    };

    const source = new EventSource("/api/agents/stream");
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as AgentEvent;
        if (event.type === "snapshot") {
          bufferRef.current = new Map(event.agents.map((agent) => [agent.agentId, agent]));
          schedule();
        } else if (event.type === "updated") {
          bufferRef.current.set(event.agent.agentId, event.agent);
          schedule();
        } else if (event.type === "removed") {
          bufferRef.current.delete(event.agentId);
          schedule();
        }
      } catch {
        /* ignore malformed frames */
      }
    };

    return () => {
      source.close();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, []);

  return { agents, connected };
}
