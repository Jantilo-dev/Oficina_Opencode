export type SessionStatus =
  | { type: "idle" }
  | { type: "busy" }
  | { type: "retry"; attempt: number; message: string; next: number };

export type Session = {
  id: string;
  projectID: string;
  directory: string;
  parentID?: string;
  title: string;
  version: string;
  time: { created: number; updated: number };
};

export type Project = {
  id: string;
  worktree: string;
  vcs?: "git";
  time: { created: number; initialized?: number };
};

export type Bootstrap = {
  directory: string;
  project: Project | null;
  sessions: Session[];
  statuses: Record<string, SessionStatus>;
  meta: Record<string, AgentMeta>;
  fetchedAt: number;
};

export type Activity = {
  tool: string;
  status: string;
  title?: string;
  at: number;
};

export type AgentMeta = {
  agent?: string;
  model?: string;
  provider?: string;
  tokens?: number;
};

export type DiffStat = { additions: number; deletions: number; files: number };

export type Part = {
  id: string;
  sessionID: string;
  type: string;
  tool?: string;
  callID?: string;
  state?: { status: string; title?: string; input?: Record<string, unknown> };
  text?: string;
  prompt?: string;
  description?: string;
  agent?: string;
};

export type AgentEvent = {
  type: string;
  directory?: string;
  properties: Record<string, any>;
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

export type ChatPart = {
  id: string;
  type: string;
  text?: string;
  tool?: string;
  status?: string;
  title?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  agent?: string;
  model?: string;
  provider?: string;
  created: number;
  tokens?: number;
  cost?: number;
  parts: ChatPart[];
};