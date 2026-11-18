import { useEffect, useMemo, useRef, useState } from "react";
import {
  abortSession,
  createSession,
  deleteSession,
  fetchAgents,
  fetchBootstrap,
  fetchHealth,
  fetchMessages,
  fetchModels,
  promptSession,
  subscribe
} from "./api";
import type {
  Activity,
  AgentEvent,
  AgentInfo,
  AgentMeta,
  Bootstrap,
  ChatMessage,
  ChatPart,
  DiffStat,
  ModelInfo,
  Session,
  SessionStatus
} from "./types";
import SceneCanvas from "./scene/OfficeCanvas";
import AgentPanel from "./scene/AgentPanel";
import { SEAT_OPTIONS, type SeatRole } from "./scene/occupancy";
import { useAgentSync } from "./useAgentSync";
import type { SceneAgent, SceneStatus } from "./scene/sprites";
import type { ThemeName } from "./office/sprites";
import NewSessionModal from "./components/NewSessionModal";
import TeamModal from "./components/TeamModal";
import ModelSelect from "./components/ModelSelect";
import ErrorBox, { isRegionError } from "./components/ErrorBox";
import SessionChat from "./components/SessionChat";
import GroupPanel from "./components/GroupPanel";
import CharacterModal from "./components/CharacterModal";
import LayoutEditor from "./layout/LayoutEditor";
import { type CharacterLook, loadCharacters, saveCharacters } from "./characters";
import { displayTitle } from "./format";
import { pendingQuestionFor } from "./chatQuestions";
import { ROLE_BY_ID, TEAM_ROLE_DEFS, TEAM_ROLE_METHODS, JEFE_DONE_TEXT, readJefeReadiness } from "./teamRoles";

const MANAGER_AGENTS = ["plan", "build"] as const;

const JEFE_PROMPT_REMINDER =
  "\n\n[ROL JEFE] No respondas que estás en modo plan ni en solo lectura. Resuelve la duda o pregunta del usuario y, si falta información, pídela. Termina siempre con una línea exacta: LISTO PARA PASAR AL EQUIPO: SÍ o LISTO PARA PASAR AL EQUIPO: NO. No implementes código.";

const QUESTION_PROMPT_REMINDER =
  "\n\n[PREGUNTAS] Si necesitas una decisión del usuario, termina con este formato:\nPREGUNTA: ...\nOPCIONES:\nA) ...\nB) ...\nSi no hay alternativas, escribe solo PREGUNTA: ...";

const THEMES: Array<{ id: ThemeName; label: string }> = [
  { id: "fuego", label: "FUEGO" },
  { id: "rubi", label: "RUBÍ" },
  { id: "esmeralda", label: "ESMERALDA" }
];

function initialTheme(): ThemeName {
  const fromUrl = new URLSearchParams(window.location.search).get("theme");
  if (fromUrl === "fuego" || fromUrl === "rubi" || fromUrl === "esmeralda") return fromUrl;
  const saved = window.localStorage.getItem("pixel-office-theme");
  if (saved === "fuego" || saved === "rubi" || saved === "esmeralda") return saved;
  return "fuego";
}

function statusKind(status: SessionStatus | undefined, error?: string): "busy" | "idle" | "retry" | "error" {
  if (error) return "error";
  if (!status) return "idle";
  if (status.type === "retry") return "retry";
  if (status.type === "busy") return "busy";
  return "idle";
}

function shortId(id: string): string {
  return id.slice(0, 8);
}

function normalizeDir(value: string | undefined): string {
  return (value ?? "").replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

function isManagerAgent(name: string | undefined): boolean {
  return MANAGER_AGENTS.some((candidate) => candidate === name);
}

type SeatAssignments = Record<string, number>;

const SEAT_LAYOUT_VERSION = "5-roles-32";

function loadSeatAssignments(): SeatAssignments {
  try {
    if (window.localStorage.getItem("pixel-office-seats-version") !== SEAT_LAYOUT_VERSION) {
      window.localStorage.removeItem("pixel-office-seats");
      window.localStorage.setItem("pixel-office-seats-version", SEAT_LAYOUT_VERSION);
      return {};
    }
    const raw = window.localStorage.getItem("pixel-office-seats");
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: SeatAssignments = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (Number.isInteger(value) && (value as number) >= 0 && (value as number) < SEAT_OPTIONS.length) {
        result[id] = value as number;
      }
    }
    return result;
  } catch {
    return {};
  }
}

type IntendedMap = Record<string, { agent?: string; model?: ModelInfo }>;

function loadIntended(): IntendedMap {
  try {
    const raw = window.localStorage.getItem("pixel-office-intended");
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: IntendedMap = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (!value || typeof value !== "object") continue;
      const item = value as { agent?: unknown; model?: unknown };
      const entry: { agent?: string; model?: ModelInfo } = {};
      if (typeof item.agent === "string") entry.agent = item.agent;
      if (item.model && typeof item.model === "object") {
        const model = item.model as Partial<ModelInfo>;
        if (typeof model.providerID === "string" && typeof model.modelID === "string") {
          entry.model = {
            providerID: model.providerID,
            modelID: model.modelID,
            providerName: String(model.providerName ?? ""),
            label: String(model.label ?? model.modelID)
          };
        }
      }
      result[id] = entry;
    }
    return result;
  } catch {
    return {};
  }
}
type GroupNames = Record<string, string>;

const GROUP_NAMES_KEY = "pixel-office-group-names";

function loadGroupNames(): GroupNames {
  try {
    const raw = window.localStorage.getItem(GROUP_NAMES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: GroupNames = {};
    for (const [area, value] of Object.entries(parsed)) {
      if (typeof value === "string") result[area] = value;
    }
    return result;
  } catch {
    return {};
  }
}

type WorkerAlert = {
  id: string;
  sessionId: string;
  text: string;
  kind: "done" | "error";
};

function parseModelKey(value: string): { providerID: string; modelID: string } | undefined {
  if (!value) return undefined;
  const [providerID, modelID] = value.split("::");
  return providerID && modelID ? { providerID, modelID } : undefined;
}

type ErrorLike = {
  name?: string;
  message?: string;
  data?: { message?: string };
};

function errorMessage(error: unknown): string {
  if (!error) return "error";
  if (typeof error === "string") return error.slice(0, 2000);
  const value = error as ErrorLike;
  return (value.data?.message ?? value.message ?? value.name ?? "error").slice(0, 2000);
}

function textOf(parts: ChatPart[]): string {
  return parts
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("");
}

function lastAssistantText(messages: ChatMessage[]): string {
  const short: string[] = [];
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (message.role !== "assistant") continue;
    const text = textOf(message.parts).trim();
    if (!text) continue;
    if (text.length >= 500 || /(^|\n)#{1,3}\s*plan\b/i.test(text)) return text;
    short.push(text);
  }
  return short[0] ?? "";
}

function latestAssistantText(messages: ChatMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (message.role !== "assistant") continue;
    const text = textOf(message.parts).trim();
    if (text) return text;
  }
  return "";
}

type HandoffCycle = {
  area: string;
  jefe: string;
  targets: string[];
  startedAt: number;
};

export default function App() {
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [sessions, setSessions] = useState<Record<string, Session>>({});
  const [statuses, setStatuses] = useState<Record<string, SessionStatus>>({});
  const [activity, setActivity] = useState<Record<string, Activity>>({});
  const [meta, setMeta] = useState<Record<string, AgentMeta>>({});
  const [permissions, setPermissions] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [diffs, setDiffs] = useState<Record<string, DiffStat>>({});
  const [transcripts, setTranscripts] = useState<Record<string, ChatMessage[]>>({});
  const [intended, setIntended] = useState<IntendedMap>(loadIntended);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [link, setLink] = useState<"connecting" | "live" | "reconnecting" | "offline">("connecting");
  const [theme, setTheme] = useState<ThemeName>(initialTheme);
  const [breaksEnabled, setBreaksEnabled] = useState(() => window.localStorage.getItem("pixel-office-breaks") !== "off");
  const [managerOverride, setManagerOverride] = useState<string | null>(() =>
    window.localStorage.getItem("pixel-office-manager")
  );
  const [seatAssignments, setSeatAssignments] = useState<SeatAssignments>(loadSeatAssignments);
  const [seatByAgent, setSeatByAgent] = useState<Record<string, number>>({});
  const [spawned, setSpawned] = useState<Record<string, number>>({});
  const [groupNames, setGroupNames] = useState<GroupNames>(loadGroupNames);
  const [workerAlerts, setWorkerAlerts] = useState<WorkerAlert[]>([]);
  const [showIndependent, setShowIndependent] = useState(
    () => window.localStorage.getItem("pixel-office-show-independent") !== "off"
  );
  const [tab, setTab] = useState<"team" | "group" | "chat">("team");
  const [groupView, setGroupView] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [teamNotice, setTeamNotice] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<Record<string, ChatMessage[]>>({});
  const [handoffCycle, setHandoffCycle] = useState<HandoffCycle | null>(null);
  const [characters, setCharacters] = useState<Record<string, CharacterLook>>(loadCharacters);
  const [editingCharacter, setEditingCharacter] = useState<string | null>(null);
  const [opcDown, setOpcDown] = useState(false);
  const [externalSelected, setExternalSelected] = useState<SceneAgent | null>(null);
  const { agents: liveAgents, connected: liveConnected } = useAgentSync();
  const [opencodeUrl, setOpencodeUrl] = useState("http://127.0.0.1:4096");
  const [bootTick, setBootTick] = useState(0);
  const [bootFailed, setBootFailed] = useState(false);
  const bootFailedRef = useRef(false);
  const dirRef = useRef<string | null>(null);
  const sessionDirsRef = useRef<Map<string, string>>(new Map());
  const loadingRef = useRef<Set<string>>(new Set());
  const previousStatusesRef = useRef<Record<string, SessionStatus>>({});

  bootFailedRef.current = bootFailed;

  const cycleTheme = () => {
    setTheme((current) => {
      const index = THEMES.findIndex((item) => item.id === current);
      const next = THEMES[(index + 1) % THEMES.length].id;
      window.localStorage.setItem("pixel-office-theme", next);
      return next;
    });
  };

  const toggleBreaks = () => {
    setBreaksEnabled((current) => {
      const next = !current;
      window.localStorage.setItem("pixel-office-breaks", next ? "on" : "off");
      return next;
    });
  };

  const toggleIndependent = () => {
    setShowIndependent((current) => {
      const next = !current;
      window.localStorage.setItem("pixel-office-show-independent", next ? "on" : "off");
      return next;
    });
  };

  const retryBootstrap = () => {
    setBootFailed(false);
    setBootTick((current) => current + 1);
  };

  useEffect(() => {
    window.localStorage.setItem(GROUP_NAMES_KEY, JSON.stringify(groupNames));
  }, [groupNames]);

  const renameGroup = (area: string, name: string) => {
    setGroupNames((prev) => ({ ...prev, [area]: name }));
  };

  const renamePerson = (id: string, name: string) => {
    setCharacters((prev) => ({
      ...prev,
      [id]: { ...prev[id], name: name.trim() ? name : undefined }
    }));
  };

  const assignManager = (id: string | null) => {
    setManagerOverride(id);
    if (id) window.localStorage.setItem("pixel-office-manager", id);
    else window.localStorage.removeItem("pixel-office-manager");
  };

  const assignSeat = (agentId: string, seat: number | null) => {
    setSeatAssignments((prev) => {
      const next = { ...prev };
      if (seat === null) delete next[agentId];
      else next[agentId] = seat;
      window.localStorage.setItem("pixel-office-seats", JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    let alive = true;
    let timer: number | null = null;
    let attempts = 0;

    const load = async () => {
      try {
        const data = await fetchBootstrap();
        if (!alive) return;
        dirRef.current = data.directory;
        sessionDirsRef.current = new Map(data.sessions.map((session) => [session.id, session.directory]));
        setBoot(data);
        setSessions(Object.fromEntries(data.sessions.map((s) => [s.id, s])));
        setStatuses(data.statuses);
        setMeta((prev) => ({ ...prev, ...data.meta }));
        setSelected((current) => current ?? data.sessions.find((s) => !s.parentID)?.id ?? data.sessions[0]?.id ?? null);
        setLink("live");
        setBootFailed(false);
      } catch {
        if (!alive) return;
        setBootFailed(true);
        setLink((current) => (current === "live" ? current : "offline"));
        if (attempts < 3) {
          attempts += 1;
          timer = window.setTimeout(load, attempts * 1000);
        }
      }
    };

    void load();

    return () => {
      alive = false;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [bootTick]);

  useEffect(() => {
    let alive = true;
    const unsubscribe = subscribe(
      (event) => handleEvent(event),
      (state) => {
        if (alive) setLink(state);
      }
    );

    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) setBootTick((current) => current + 1);
    };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, []);

  useEffect(() => {
    saveCharacters(characters);
  }, [characters]);

  useEffect(() => {
    window.localStorage.setItem("pixel-office-intended", JSON.stringify(intended));
  }, [intended]);

  useEffect(() => {
    if (!boot || !managerOverride) return;
    if (sessions[managerOverride]) return;
    setManagerOverride(null);
    window.localStorage.removeItem("pixel-office-manager");
  }, [boot, managerOverride, sessions]);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const health = await fetchHealth();
        if (!alive) return;
        setOpcDown(!health.upstream);
        setOpencodeUrl(health.opencode);
        if (health.upstream && bootFailedRef.current) {
          bootFailedRef.current = false;
          setBootTick((current) => current + 1);
        }
      } catch {
        if (alive) setOpcDown(true);
      }
    };
    void check();
    const timer = setInterval(check, 8000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (opcDown) return;
    let alive = true;
    Promise.all([fetchAgents(), fetchModels()])
      .then(([agentList, modelData]) => {
        if (!alive) return;
        setAgents(agentList);
        setModels(modelData.models ?? []);
      })
      .catch(() => {
        /* ignore, banner covers upstream */
      });
    return () => {
      alive = false;
    };
  }, [opcDown]);

  useEffect(() => {
    if (!selected) return;
    if (transcripts[selected] !== undefined) return;
    if (loadingRef.current.has(selected)) return;
    loadingRef.current.add(selected);
    fetchMessages(selected)
      .then((list) =>
        setTranscripts((prev) => {
          const live = prev[selected] ?? [];
          const merged = list.map((message) => {
            const existing = live.find((item) => item.id === message.id);
            if (!existing) return message;
            const parts = [...message.parts];
            for (const part of existing.parts) {
              const index = parts.findIndex((item) => item.id === part.id);
              if (index >= 0) parts[index] = { ...parts[index], ...part };
              else parts.push(part);
            }
            return { ...message, ...existing, parts };
          });
          for (const message of live) {
            if (!merged.some((item) => item.id === message.id)) merged.push(message);
          }
          merged.sort((a, b) => a.created - b.created);
          return { ...prev, [selected]: merged };
        })
      )
      .catch(() => {
        /* keep empty; events will fill */
      })
      .finally(() => loadingRef.current.delete(selected));
  }, [selected, transcripts]);

  const forgetSession = (id: string) => {
    sessionDirsRef.current.delete(id);
    const agentKey = `oc:${id}`;
    setSeatAssignments((prev) => {
      if (!(agentKey in prev)) return prev;
      const next = { ...prev };
      delete next[agentKey];
      window.localStorage.setItem("pixel-office-seats", JSON.stringify(next));
      return next;
    });
    const remove = <T,>(prev: Record<string, T>): Record<string, T> => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    };
    setSessions(remove);
    setStatuses(remove);
    setMeta(remove);
    setActivity(remove);
    setPermissions(remove);
    setErrors(remove);
    setDiffs(remove);
    setSpawned(remove);
    setTranscripts(remove);
    setIntended(remove);
    setCharacters(remove);
    setSelected((current) => (current === id ? null : current));
    setExternalSelected((current) => (current?.id === `oc:${id}` ? null : current));
  };

  const sessionAllowed = (id: string): boolean => {
    const directory = sessionDirsRef.current.get(id);
    if (directory !== undefined) {
      return !dirRef.current || normalizeDir(directory) === normalizeDir(dirRef.current);
    }
    return !dirRef.current;
  };

  const handleEvent = (event: AgentEvent) => {
    const type = event.type;
    const props = event.properties ?? {};

    if (type === "server.connected") {
      if (bootFailedRef.current) setBootTick((current) => current + 1);
      return;
    }

    if (type === "session.created" || type === "session.updated") {
      const info = props.info as Session;
      if (!info?.id) return;
      if (dirRef.current && normalizeDir(info.directory) !== normalizeDir(dirRef.current)) return;
      sessionDirsRef.current.set(info.id, info.directory);
      if (type === "session.created") {
        setSpawned((prev) => (prev[info.id] ? prev : { ...prev, [info.id]: Date.now() }));
      }
      setSessions((prev) => ({ ...prev, [info.id]: info }));
      setStatuses((prev) => (prev[info.id] ? prev : { ...prev, [info.id]: { type: "idle" } }));
      setSelected((current) => current ?? info.id);
      return;
    }

    if (type === "session.deleted") {
      const info = props.info as Session;
      if (info?.id) forgetSession(info.id);
      return;
    }

    if (type === "session.status") {
      const sessionID = String(props.sessionID);
      if (!sessionAllowed(sessionID)) return;
      const status = props.status as SessionStatus;
      setStatuses((prev) => ({ ...prev, [sessionID]: status }));
      if (status.type === "busy") {
        setErrors((prev) => {
          if (!prev[sessionID]) return prev;
          const next = { ...prev };
          delete next[sessionID];
          return next;
        });
      }
      return;
    }

    if (type === "session.idle") {
      const sessionID = String(props.sessionID);
      if (!sessionAllowed(sessionID)) return;
      setStatuses((prev) => ({ ...prev, [sessionID]: { type: "idle" } }));
      setActivity((prev) => {
        if (!prev[sessionID]) return prev;
        const next = { ...prev };
        delete next[sessionID];
        return next;
      });
      setPermissions((prev) => {
        if (!prev[sessionID]) return prev;
        const next = { ...prev };
        delete next[sessionID];
        return next;
      });
      return;
    }

    if (type === "session.error") {
      const sessionID = String(props.sessionID ?? "");
      if (!sessionID || !sessionAllowed(sessionID)) return;
      const error = errorMessage(props.error);
      setErrors((prev) => ({ ...prev, [sessionID]: error }));
      return;
    }

    if (type === "message.updated") {
      const info = props.info;
      if (!info?.sessionID) return;
      if (!sessionAllowed(info.sessionID)) return;
      const apiError = info.error ? errorMessage(info.error) : null;
      setErrors((prev) => {
        if (apiError) return { ...prev, [info.sessionID]: apiError };
        if (!prev[info.sessionID]) return prev;
        const next = { ...prev };
        delete next[info.sessionID];
        return next;
      });
      if (info.role === "user") {
        setMeta((prev) => ({
          ...prev,
          [info.sessionID]: {
            ...prev[info.sessionID],
            agent: info.agent,
            model: info.model?.modelID,
            provider: info.model?.providerID
          }
        }));
      } else {
        const tokens = (info.tokens?.input ?? 0) + (info.tokens?.output ?? 0) + (info.tokens?.reasoning ?? 0);
        setMeta((prev) => ({
          ...prev,
          [info.sessionID]: { ...prev[info.sessionID], model: info.modelID, provider: info.providerID, tokens }
        }));
      }
      setTranscripts((prev) => {
        const list = prev[info.sessionID];
        if (!list) return prev;
        const index = list.findIndex((message) => message.id === info.id);
        const role: "user" | "assistant" = info.role === "user" ? "user" : "assistant";
        const tokens =
          role === "assistant" && info.tokens
            ? (info.tokens.input ?? 0) + (info.tokens.output ?? 0) + (info.tokens.reasoning ?? 0)
            : undefined;

        if (index < 0) {
          const stub: ChatMessage = {
            id: info.id,
            role,
            agent: role === "user" ? info.agent : undefined,
            model: role === "user" ? info.model?.modelID : info.modelID,
            provider: role === "user" ? info.model?.providerID : info.providerID,
            created: info.time?.created ?? Date.now(),
            tokens,
            cost: typeof info.cost === "number" ? info.cost : undefined,
            parts: []
          };
          const next = [...list, stub].sort((a, b) => a.created - b.created);
          return { ...prev, [info.sessionID]: next };
        }

        const message = list[index];
        const next = [...list];
        next[index] = {
          ...message,
          role,
          agent: role === "user" ? info.agent : message.agent,
          model: role === "user" ? info.model?.modelID : info.modelID,
          provider: role === "user" ? info.model?.providerID : info.providerID,
          tokens: tokens ?? message.tokens,
          cost: typeof info.cost === "number" ? info.cost : message.cost
        };
        return { ...prev, [info.sessionID]: next };
      });
      return;
    }

    if (type === "message.part.updated") {
      const part = props.part;
      if (!part?.sessionID) return;
      if (!sessionAllowed(part.sessionID)) return;
      if (part.type === "tool") {
        const state = part.state ?? {};
        const title =
          (state as { title?: string }).title ??
          (state.input && typeof state.input.description === "string" ? (state.input.description as string) : undefined);
        setActivity((prev) => ({
          ...prev,
          [part.sessionID]: {
            tool: part.tool ?? "tool",
            status: state.status ?? "pending",
            title,
            at: Date.now()
          }
        }));
      }

      setTranscripts((prev) => {
        const list = prev[part.sessionID];
        if (!list) return prev;
        const index = list.findIndex((message) => message.id === part.messageID);
        const message = index >= 0 ? list[index] : null;
        const parts = message ? [...message.parts] : [];
        const partIndex = parts.findIndex((item) => item.id === part.id);
        const previous = partIndex >= 0 ? parts[partIndex] : null;

        let incoming: ChatPart | null = null;
        if (part.type === "text") {
          const text =
            typeof part.text === "string" ? part.text : `${previous?.text ?? ""}${props.delta ?? ""}`;
          incoming = { id: part.id, type: "text", text };
        } else if (part.type === "tool") {
          incoming = {
            id: part.id,
            type: "tool",
            tool: part.tool,
            status: part.state?.status,
            title: part.state?.title
          };
        }
        if (!incoming) return prev;

        if (!message) {
          const stub: ChatMessage = {
            id: part.messageID,
            role: "assistant",
            created: Date.now(),
            parts: [incoming]
          };
          return { ...prev, [part.sessionID]: [...list, stub] };
        }

        if (partIndex >= 0) parts[partIndex] = { ...parts[partIndex], ...incoming };
        else parts.push(incoming);

        const next = [...list];
        next[index] = { ...message, parts };
        return { ...prev, [part.sessionID]: next };
      });
      return;
    }

    if (type === "permission.updated") {
      const sessionID = String(props.sessionID ?? "");
      if (sessionID && sessionAllowed(sessionID)) {
        setPermissions((prev) => ({ ...prev, [sessionID]: props.title ?? "permiso" }));
      }
      return;
    }

    if (type === "permission.replied") {
      const sessionID = String(props.sessionID ?? "");
      setPermissions((prev) => {
        if (!prev[sessionID]) return prev;
        const next = { ...prev };
        delete next[sessionID];
        return next;
      });
      return;
    }

    if (type === "session.diff") {
      const sessionID = String(props.sessionID ?? "");
      const files = Array.isArray(props.diff) ? props.diff : [];
      const stat = files.reduce(
        (acc: DiffStat, file: { additions?: number; deletions?: number }) => ({
          additions: acc.additions + (file.additions ?? 0),
          deletions: acc.deletions + (file.deletions ?? 0),
          files: acc.files + 1
        }),
        { additions: 0, deletions: 0, files: 0 }
      );
      if (sessionID && sessionAllowed(sessionID)) setDiffs((prev) => ({ ...prev, [sessionID]: stat }));
    }
  };

  const allSessions = useMemo(
    () => Object.values(sessions).sort((a, b) => a.time.created - b.time.created),
    [sessions]
  );
  const roots = allSessions.filter((s) => !s.parentID || !sessions[s.parentID]);
  const teamAreasList = [...new Set(SEAT_OPTIONS.filter((option) => option.role).map((option) => option.area))];
  const detectedTeams = useMemo(() => {
    const byArea = new Map<string, Map<SeatRole, string>>();
    for (const session of allSessions) {
      if (session.parentID) continue;
      const title = session.title ?? "";
      for (const area of teamAreasList) {
        const prefix = `${area} · `;
        if (!title.startsWith(prefix)) continue;
        const suffix = title.slice(prefix.length).trim();
        const definition = TEAM_ROLE_DEFS.find((item) => item.title === suffix);
        if (!definition) continue;
        const roles = byArea.get(area) ?? new Map<SeatRole, string>();
        roles.set(definition.role, session.id);
        byArea.set(area, roles);
      }
    }
    const complete = [...byArea.entries()].filter(([, roles]) =>
      TEAM_ROLE_DEFS.every((definition) => roles.has(definition.role))
    ) as Array<[string, Map<SeatRole, string>]>;
    const bySession = new Map<string, { area: string; roles: Map<SeatRole, string> }>();
    const rootTeam = new Map<string, { area: string; roles: Map<SeatRole, string> }>();
    for (const [area, roles] of complete) {
      const team = { area, roles };
      for (const id of roles.values()) {
        bySession.set(id, team);
        rootTeam.set(id, team);
      }
    }
    const subagents: string[] = [];
    for (const session of allSessions) {
      if (!session.parentID) continue;
      let cursor = session;
      const seen = new Set<string>();
      while (cursor.parentID && sessions[cursor.parentID] && !seen.has(cursor.id)) {
        seen.add(cursor.id);
        cursor = sessions[cursor.parentID];
      }
      const team = rootTeam.get(cursor.id);
      if (team) {
        bySession.set(session.id, team);
        subagents.push(session.id);
      }
    }
    return {
      teams: complete.map(([area, roles]) => ({ area, roles })),
      bySession,
      subagents
    };
  }, [allSessions]);
  const teamRootIds = useMemo(
    () => new Set(detectedTeams.teams.flatMap((team) => [...team.roles.values()])),
    [detectedTeams]
  );
  useEffect(() => {
    if (detectedTeams.subagents.length === 0) return;
    const fallback = models.find(
      (model) => model.providerID === "opencode-go" && model.modelID === "deepseek-v4.1-flash"
    );
    const resolveGo = (id: string): ModelInfo | undefined => {
      const direct = intended[id]?.model;
      if (direct?.providerID === "opencode-go") return direct;
      const provider = meta[id]?.provider;
      const modelId = meta[id]?.model;
      if (provider !== "opencode-go" || !modelId) return undefined;
      return (
        models.find((model) => model.providerID === provider && model.modelID === modelId) ?? {
          providerID: provider,
          providerName: "OpenCode Go",
          modelID: modelId,
          label: modelId
        }
      );
    };
    setIntended((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id of detectedTeams.subagents) {
        const team = detectedTeams.bySession.get(id);
        if (!team) continue;
        const roleIds = new Set(team.roles.values());
        let chosen: ModelInfo | undefined;
        let cursor = sessions[id]?.parentID;
        const seen = new Set<string>();
        while (cursor && !seen.has(cursor)) {
          seen.add(cursor);
          if (roleIds.has(cursor)) {
            chosen = resolveGo(cursor);
            if (chosen) break;
          }
          cursor = sessions[cursor]?.parentID;
        }
        if (!chosen) {
          for (const roleId of roleIds) {
            chosen = resolveGo(roleId);
            if (chosen) break;
          }
        }
        chosen ??= fallback;
        if (!chosen) continue;
        const current = prev[id]?.model;
        if (current?.providerID === chosen.providerID && current.modelID === chosen.modelID) continue;
        next[id] = { ...prev[id], model: { ...chosen } };
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [detectedTeams, models, sessions, meta, intended]);
  useEffect(() => {
    if (!handoffCycle) return;
    const ids = new Set(handoffCycle.targets);
    for (const [id, team] of detectedTeams.bySession) {
      if (team.area === handoffCycle.area && id !== handoffCycle.jefe) ids.add(id);
    }
    const active = [...ids].some((id) => {
      const status = statuses[id];
      return status?.type === "busy" || status?.type === "retry" || Boolean(permissions[id]);
    });
    if (active) return;
    const delay = Math.max(1500, 4000 - (Date.now() - handoffCycle.startedAt));
    const timer = window.setTimeout(() => {
      const jefe = handoffCycle.jefe;
      const messageId = `jefe-done-${handoffCycle.startedAt}`;
      const jefeIntended = intended[jefe];
      const jefeMeta = meta[jefe];
      setLocalMessages((prev) => {
        const list = prev[jefe] ?? [];
        if (list.some((message) => message.id === messageId)) return prev;
        const message: ChatMessage = {
          id: messageId,
          role: "assistant",
          agent: jefeIntended?.agent ?? jefeMeta?.agent ?? "plan",
          model: jefeIntended?.model?.modelID ?? jefeMeta?.model,
          provider: jefeIntended?.model?.providerID ?? jefeMeta?.provider,
          created: Date.now(),
          parts: [{ id: `${messageId}-text`, type: "text", text: JEFE_DONE_TEXT }]
        };
        return { ...prev, [jefe]: [...list, message] };
      });
      setTeamNotice(JEFE_DONE_TEXT);
      setHandoffCycle(null);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [handoffCycle, statuses, permissions, detectedTeams, intended, meta]);
  const sessionActive = (id: string) =>
    statuses[id]?.type === "busy" ||
    statuses[id]?.type === "retry" ||
    Boolean(permissions[id]) ||
    Boolean(errors[id]);
  const visibleSessions = useMemo(
    () =>
      allSessions.filter((session) => {
        const independent = !session.parentID && !teamRootIds.has(session.id);
        if (independent && !showIndependent) return false;
        return (
          !session.parentID ||
          !sessions[session.parentID] ||
          session.id === selected ||
          sessionActive(session.id)
        );
      }),
    [allSessions, sessions, selected, statuses, permissions, errors, showIndependent, teamRootIds]
  );
  const officeSessions = useMemo(
    () =>
      visibleSessions.filter(
        (session) => !session.parentID && (showIndependent || teamRootIds.has(session.id))
      ),
    [visibleSessions, showIndependent, teamRootIds]
  );
  const busyCount =
    allSessions.filter((s) => statuses[s.id]?.type === "busy" || permissions[s.id]).length +
    liveAgents.filter((agent) => agent.status !== "idle").length;
  const agentByName = useMemo(() => new Map(agents.map((agent) => [agent.name, agent])), [agents]);
  const managerId = useMemo(() => {
    const roots = Object.values(sessions).filter((session) => !session.parentID || !sessions[session.parentID]);
    const eligible = roots.filter((session) =>
      isManagerAgent(meta[session.id]?.agent ?? intended[session.id]?.agent)
    );
    if (managerOverride && eligible.some((session) => session.id === managerOverride)) {
      return managerOverride;
    }
    const preferred = MANAGER_AGENTS.map((name) =>
      eligible
        .filter((session) => meta[session.id]?.agent === name || intended[session.id]?.agent === name)
        .sort((a, b) => a.time.created - b.time.created)[0]
    ).find(Boolean);
    return preferred?.id ?? null;
  }, [sessions, meta, intended, managerOverride]);

  const selectedSession = selected ? sessions[selected] : null;
  const selectedStatus = selected ? statuses[selected] : undefined;
  const selectedMeta = selected ? meta[selected] : undefined;
  const selectedActivity = selected ? activity[selected] : undefined;
  const selectedDiff = selected ? diffs[selected] : undefined;
  const selectedPermission = selected ? permissions[selected] : undefined;
  const selectedError = selected ? errors[selected] : undefined;
  const selectedIntended = selected ? intended[selected] : undefined;
  const selectedBusy = Boolean(
    selected && (selectedStatus?.type === "busy" || selectedStatus?.type === "retry" || selectedPermission)
  );
  const chatBusyLabel = !selectedBusy
    ? ""
    : selectedPermission
      ? "Esperando permiso⬦"
      : selectedStatus?.type === "retry"
        ? "Reintentando⬦"
        : ["edit", "write", "patch", "multiedit"].includes(selectedActivity?.tool ?? "")
          ? "Editando archivos⬦"
          : ["bash", "shell"].includes(selectedActivity?.tool ?? "")
            ? "Ejecutando comando⬦"
            : ["read", "grep", "glob", "list", "webfetch"].includes(selectedActivity?.tool ?? "")
              ? "Revisando archivos⬦"
              : "Pensando⬦";
  const chatAgent = selectedIntended?.agent ?? selectedMeta?.agent;
  const canAssignManager = Boolean(
    selectedSession &&
      roots.some((session) => session.id === selectedSession.id) &&
      isManagerAgent(chatAgent)
  );
  const selectedKey = selected ? `oc:${selected}` : null;
  const assignedSeat = selectedKey ? seatAssignments[selectedKey] : undefined;
  const currentSeat = selectedKey ? seatByAgent[selectedKey] : undefined;
  const seatOwners = useMemo(() => {
    const owners = new Map<number, string>();
    for (const [id, seat] of Object.entries(seatByAgent)) owners.set(seat, id);
    return owners;
  }, [seatByAgent]);
  const teamAreas = useMemo(() => {
    const names = [...new Set(SEAT_OPTIONS.filter((option) => option.role).map((option) => option.area))];
    return names.map((name) => {
      const seats = SEAT_OPTIONS.filter((option) => option.area === name && option.role).map(
        (option) => option.index
      );
      const occupied = seats.filter((index) => seatOwners.has(index)).length;
      return {
        name,
        available: occupied === 0,
        reason:
          occupied > 0
            ? `${name} tiene ${occupied} de ${seats.length} puestos ocupados. Libera esos puestos para crear el equipo.`
            : undefined
      };
    });
  }, [seatOwners]);
  const teamPinnedAgents = useMemo(() => {
    const pinned = new Set<string>();
    const areas = [...new Set(SEAT_OPTIONS.filter((option) => option.role).map((option) => option.area))];
    for (const area of areas) {
      const seats = SEAT_OPTIONS.filter((option) => option.area === area && option.role).map(
        (option) => option.index
      );
      const owners = seats.map(
        (index) =>
          Object.entries(seatByAgent).find(
            ([id, seat]) => seat === index && id.startsWith("oc:")
          )?.[0]
      );
      if (owners.every(Boolean) && new Set(owners).size === seats.length) {
        for (const owner of owners) {
          if (owner) pinned.add(owner);
        }
      }
    }
    for (const team of detectedTeams.teams) {
      for (const id of team.roles.values()) pinned.add(`oc:${id}`);
    }
    return pinned;
  }, [seatByAgent, detectedTeams]);
  useEffect(() => {
    if (detectedTeams.teams.length === 0) return;
    setSeatAssignments((prev) => {
      let changed = false;
      const next = { ...prev };
      const owners = new Map<number, string>();
      for (const [id, seat] of Object.entries(seatByAgent)) owners.set(seat, id);
      for (const team of detectedTeams.teams) {
        const memberKeys = new Set([...team.roles.values()].map((id) => `oc:${id}`));
        const seats = TEAM_ROLE_DEFS.map((definition) => ({
          role: definition.role,
          id: team.roles.get(definition.role),
          seat: SEAT_OPTIONS.find((option) => option.area === team.area && option.role === definition.role)
        }));
        if (seats.some((item) => !item.id || !item.seat)) continue;
        const conflict = seats.some((item) => {
          const owner = owners.get(item.seat!.index);
          return owner && !memberKeys.has(owner);
        });
        if (conflict) continue;
        for (const item of seats) {
          const key = `oc:${item.id}`;
          const index = item.seat!.index;
          if (next[key] !== index) {
            next[key] = index;
            changed = true;
          }
        }
      }
      if (!changed) return prev;
      window.localStorage.setItem("pixel-office-seats", JSON.stringify(next));
      return next;
    });
  }, [detectedTeams, seatByAgent]);
  const selectedTeam = selected ? detectedTeams.bySession.get(selected) : undefined;
  const selectedRole = selectedTeam
    ? [...selectedTeam.roles.entries()].find(([, id]) => id === selected)?.[0]
    : undefined;
  const selectedRoleLabel = selectedRole ? ROLE_BY_ID.get(selectedRole)?.title : undefined;
  const isTeamJefe = Boolean(selected && selectedTeam?.roles.get("plan") === selected);
  const selectedPinned = selectedKey ? teamPinnedAgents.has(selectedKey) : false;
  const selectedSeatOption = currentSeat !== undefined ? SEAT_OPTIONS[currentSeat] : undefined;
  const isJefeSelected = isTeamJefe || selectedSeatOption?.role === "plan";
  const planText = selected ? lastAssistantText(transcripts[selected] ?? []) : "";
  const latestJefeText = selected ? latestAssistantText(transcripts[selected] ?? []) : "";
  const jefeReady = isJefeSelected ? readJefeReadiness(latestJefeText) : null;
  const jefePending = isJefeSelected && selected ? pendingQuestionFor(transcripts[selected] ?? []) : null;
  const handoffTargets = useMemo(() => {
    if (selectedTeam) {
      return TEAM_ROLE_DEFS.filter((definition) => definition.role !== "plan").flatMap(
        (definition) => {
          const sessionId = selectedTeam.roles.get(definition.role);
          return sessionId ? [{ sessionId, role: definition.role }] : [];
        }
      );
    }
    if (!selectedSeatOption || selectedSeatOption.role !== "plan") return [];
    const bySeat = new Map<number, string>();
    for (const [agentId, seat] of Object.entries(seatByAgent)) {
      if (agentId.startsWith("oc:")) bySeat.set(seat, agentId.slice(3));
    }
    return SEAT_OPTIONS.flatMap((option) => {
      if (option.area !== selectedSeatOption.area || !option.role || option.role === "plan") {
        return [];
      }
      const sessionId = bySeat.get(option.index);
      return sessionId ? [{ sessionId, role: option.role }] : [];
    });
  }, [selectedTeam, selectedSeatOption, seatByAgent]);
  const chatModel = selectedIntended?.model?.modelID ?? selectedMeta?.model;
  const chatMessages = useMemo(() => {
    if (!selected) return [];
    return [...(transcripts[selected] ?? []), ...(localMessages[selected] ?? [])].sort(
      (a, b) => a.created - b.created
    );
  }, [selected, transcripts, localMessages]);
  const selectedModelKey = selectedIntended?.model
    ? `${selectedIntended.model.providerID}::${selectedIntended.model.modelID}`
    : "";

  const setSessionModel = (id: string, key: string) => {
    const model = parseModelKey(key);
    setIntended((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        model: model ? ({ ...model, providerName: "", label: model.modelID } as ModelInfo) : undefined
      }
    }));
    setMeta((prev) => ({
      ...prev,
      [id]: { ...prev[id], model: model?.modelID, provider: model?.providerID }
    }));
  };

  const setSessionAgent = (id: string, agent: string) => {
    setIntended((prev) => ({ ...prev, [id]: { ...prev[id], agent } }));
    setMeta((prev) => ({ ...prev, [id]: { ...prev[id], agent } }));
  };

  const useGoForTeam = (): boolean => {
    if (!selectedTeam) return false;
    let changed = 0;
    let already = 0;
    const missing: string[] = [];
    for (const definition of TEAM_ROLE_DEFS) {
      const id = selectedTeam.roles.get(definition.role);
      if (!id) continue;
      const current = intended[id]?.model?.modelID ?? meta[id]?.model;
      const currentProvider = intended[id]?.model?.providerID ?? meta[id]?.provider;
      if (currentProvider === "opencode-go") {
        already += 1;
        continue;
      }
      const candidate = current
        ? models.find((model) => model.providerID === "opencode-go" && model.modelID === current)
        : undefined;
      if (candidate) {
        setSessionModel(id, `${candidate.providerID}::${candidate.modelID}`);
        changed += 1;
      } else {
        missing.push(definition.title);
      }
    }
    if (changed > 0) {
      setErrors((prev) => {
        const next = { ...prev };
        let touched = false;
        for (const id of selectedTeam.roles.values()) {
          if (next[id]) {
            delete next[id];
            touched = true;
          }
        }
        return touched ? next : prev;
      });
    }
    setTeamNotice(
      changed > 0
        ? `OpenCode Go aplicado a ${changed} miembro(s)${
            missing.length ? `; sin equivalente Go: ${missing.join(", ")}` : ""
          }.`
        : already > 0
          ? "El equipo ya usa OpenCode Go; revisa el saldo de Go."
          : "No hay modelos equivalentes de OpenCode Go para este equipo."
    );
    return changed > 0;
  };
  const regionalFallbackFor = (id: string): string | null => {
    const current = intended[id]?.model?.modelID ?? meta[id]?.model;
    if (!current) return null;
    const candidate =
      models.find((model) => model.providerID === "opencode" && model.modelID === current) ??
      models.find((model) => model.providerID !== "opencode-go" && model.modelID === current);
    return candidate ? `${candidate.providerID}::${candidate.modelID}` : null;
  };

  const useRegionalModel = (id: string): boolean => {
    const key = regionalFallbackFor(id);
    if (!key) return false;
    setSessionModel(id, key);
    setErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    return true;
  };

  const selectedRegionalAction =
    selected && selectedError && isRegionError(selectedError) && regionalFallbackFor(selected)
      ? {
          label: "Usar modelo regional",
          onClick: () => useRegionalModel(selected)
        }
      : undefined;

  const selectSession = (id: string) => {
    setSelected(id);
    setTab("chat");
  };

  const openGroup = (area: string) => {
    const team = detectedTeams.teams.find((item) => item.area === area);
    const jefe = team?.roles.get("plan");
    if (jefe) setSelected(jefe);
    setGroupView(area);
    setTab("group");
  };

  const dismissAlert = (id: string) => {
    setWorkerAlerts((current) => current.filter((item) => item.id !== id));
  };

  const nameFor = (session: Session) => characters[session.id]?.name?.trim() || displayTitle(session.title);

  useEffect(() => {
    const previous = previousStatusesRef.current;
    const next: Record<string, SessionStatus> = {};
    const additions: WorkerAlert[] = [];
    const now = Date.now();

    for (const [id, status] of Object.entries(statuses)) {
      next[id] = status;
      const before = previous[id];
      if (!before) continue;
      const wasWorking = before.type === "busy" || before.type === "retry";
      if (!wasWorking || status.type !== "idle") continue;
      const session = sessions[id];
      if (!session) continue;
      const team = detectedTeams.bySession.get(id);
      const roleEntry = team ? [...team.roles.entries()].find(([, sessionId]) => sessionId === id) : undefined;
      const role = roleEntry ? ROLE_BY_ID.get(roleEntry[0])?.title : undefined;
      const group = team ? groupNames[team.area]?.trim() : undefined;
      const error = errors[id];
      const person = characters[id]?.name?.trim() || (team ? "Sin nombre" : displayTitle(session.title));
      additions.push({
        id: `worker-${id}-${now}`,
        sessionId: id,
        text: `${person}${role ? ` · ${role}` : ""}${group ? ` · ${group}` : ""} ${
          error ? "terminó con error" : "terminó su tarea"
        }.`,
        kind: error ? "error" : "done"
      });
    }

    previousStatusesRef.current = next;
    if (additions.length === 0) return;
    setWorkerAlerts((current) => [...current, ...additions].slice(-5));
    for (const alert of additions) {
      window.setTimeout(() => {
        setWorkerAlerts((current) => current.filter((item) => item.id !== alert.id));
      }, 9000);
    }
  }, [statuses, sessions, errors, detectedTeams, groupNames, characters]);

  const sceneAgents = useMemo<SceneAgent[]>(() => {
    const list: SceneAgent[] = [];

    for (const session of officeSessions) {
      const st = statuses[session.id];
      const act = activity[session.id];
      const err = errors[session.id];
      const perm = permissions[session.id];
      let status: SceneStatus = "idle";
      if (err) status = "error";
      else if (perm) status = "thinking";
      else if (st?.type === "busy" || st?.type === "retry") {
        const tool = act?.tool ?? "";
        status = ["edit", "write", "patch", "multiedit"].includes(tool)
          ? "coding"
          : ["bash", "shell"].includes(tool)
            ? "running_tool"
            : "thinking";
      }
      const logs = (transcripts[session.id] ?? [])
        .slice(-3)
        .flatMap((message) =>
          message.parts.filter((part) => part.type === "text").map((part) => (part.text ?? "").slice(0, 140))
        )
        .filter(Boolean);
      list.push({
        id: `oc:${session.id}`,
        name: nameFor(session),
        status,
        task: act?.title ?? act?.tool ?? meta[session.id]?.agent,
        file: status === "coding" ? act?.title : undefined,
        logs,
        look: characters[session.id],
        spawnedAt: spawned[session.id],
        isManager: session.id === managerId
      });
    }

    return list;
  }, [officeSessions, statuses, activity, errors, permissions, transcripts, characters, meta, spawned, managerId]);

  useEffect(() => {
    setExternalSelected((current) =>
      current && !liveAgents.some((agent) => `live:${agent.agentId}` === current.id) ? null : current
    );
  }, [liveAgents]);

  const createAgentSession = async (input: {
    agent: string;
    model?: { providerID: string; modelID: string };
    title: string;
    text: string;
  }) => {
    const title =
      input.title || input.text.replace(/\s+/g, " ").slice(0, 48).trim() || `Sesión ${new Date().toISOString().slice(11, 19)}`;
    const session = await createSession(title);
    sessionDirsRef.current.set(session.id, session.directory);
    await promptSession(session.id, { text: input.text, agent: input.agent, model: input.model });
    setSessions((prev) => ({ ...prev, [session.id]: session }));
    setSpawned((prev) => ({ ...prev, [session.id]: Date.now() }));
    setStatuses((prev) => ({ ...prev, [session.id]: { type: "busy" } }));
    setMeta((prev) => ({
      ...prev,
      [session.id]: { agent: input.agent, model: input.model?.modelID, provider: input.model?.providerID }
    }));
    setIntended((prev) => ({
      ...prev,
      [session.id]: { agent: input.agent, model: input.model ? ({ ...input.model, providerName: "", label: input.model.modelID } as ModelInfo) : undefined }
    }));
    setSelected(session.id);
    setTab("chat");
    setModalOpen(false);
  };

  const TEAM_ROLES = TEAM_ROLE_DEFS.map((definition) => ({
    role: definition.role,
    title: definition.title,
    starts: definition.role === "plan",
    text:
      definition.role === "plan"
        ? `Eres el Jefe de Planificación del área. No respondas que estás en modo plan (solo lectura) ni expliques limitaciones de permisos. Tu trabajo es resolver todas las dudas y preguntas del usuario, cerrar el alcance, los criterios de aceptación y dividir el trabajo por rol: Frontend (UI, botones, estilos), Backend (lógica, API, datos), QA (pruebas, aceptación) y Documentación (docs y Scrum). Antes de repartir, confirma que no quedan dudas. En cada respuesta termina con una línea exacta: LISTO PARA PASAR AL EQUIPO: SÍ o LISTO PARA PASAR AL EQUIPO: NO. Usa NO mientras falte algo; usa SÍ solo cuando el plan esté cerrado. No implementes código.${QUESTION_PROMPT_REMINDER}`
        : definition.brief
  }));

  const createTeam = async (input: {
    area: string;
    roles: Array<{
      role: "plan" | "frontend" | "backend" | "qa" | "docs";
      method: "plan" | "build";
      model: string;
    }>;
  }) => {
    const seats = SEAT_OPTIONS.filter((option) => option.area === input.area && option.role);
    if (seats.length !== TEAM_ROLES.length) throw new Error("El área no tiene los cinco puestos.");
    if (seats.some((seat) => seatOwners.has(seat.index))) {
      throw new Error("El área tiene puestos ocupados. Libéralos antes de crear el equipo.");
    }
    const byRole = new Map(input.roles.map((item) => [item.role, item]));

    const parseModel = (key: string, agent: string) => {
      if (key) {
        const [providerID, modelID] = key.split("::");
        if (providerID && modelID) return { providerID, modelID };
      }
      return agents.find((item) => item.name === agent)?.model;
    };

    const specs = TEAM_ROLES.map((definition) => {
      const seat = seats.find((item) => item.role === definition.role);
      const roleInput = byRole.get(definition.role);
      if (!seat || !roleInput) throw new Error(`Falta la configuración de ${definition.title}.`);
      return {
        seat,
        agent: roleInput.method,
        modelKey: roleInput.model,
        title: definition.title,
        starts: definition.starts,
        text: `Eres ${definition.title} del área ${input.area}. ${definition.text}`
      };
    });

    const assignments: Record<string, number> = {};
    try {
      for (const spec of specs) {
        const session = await createSession(`${input.area} · ${spec.title}`);
        sessionDirsRef.current.set(session.id, session.directory);
        assignments[`oc:${session.id}`] = spec.seat.index;
        const model = parseModel(spec.modelKey, spec.agent);
        setSessions((prev) => ({ ...prev, [session.id]: session }));
        setSpawned((prev) => ({ ...prev, [session.id]: Date.now() }));
        setStatuses((prev) => ({
          ...prev,
          [session.id]: { type: spec.starts ? "busy" : "idle" }
        }));
        setMeta((prev) => ({
          ...prev,
          [session.id]: {
            agent: spec.agent,
            model: model?.modelID,
            provider: model?.providerID
          }
        }));
        setIntended((prev) => ({
          ...prev,
          [session.id]: {
            agent: spec.agent,
            model: model ? ({ ...model, providerName: "", label: model.modelID } as ModelInfo) : undefined
          }
        }));
        if (spec.starts) {
          await promptSession(session.id, {
            text: spec.text,
            agent: spec.agent,
            model
          });
        }
      }
      const firstSession = Object.keys(assignments)[0];
      if (firstSession) {
        setSelected(firstSession.slice(3));
        setTab("chat");
      }
      setTeamModalOpen(false);
    } finally {
      if (Object.keys(assignments).length > 0) {
        setSeatAssignments((prev) => {
          const next = { ...prev, ...assignments };
          window.localStorage.setItem("pixel-office-seats", JSON.stringify(next));
          return next;
        });
      }
    }
  };

  const sendPrompt = async (text: string) => {
    if (!selected) return;
    const id = selected;
    setStatuses((prev) => ({ ...prev, [id]: { type: "busy" } }));
    setErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    try {
      await promptSession(id, {
        text: `${text}${isJefeSelected ? JEFE_PROMPT_REMINDER : ""}${QUESTION_PROMPT_REMINDER}`,
        agent: chatAgent,
        model: selectedIntended?.model
          ? { providerID: selectedIntended.model.providerID, modelID: selectedIntended.model.modelID }
          : undefined
      });
    } catch (err) {
      setStatuses((prev) => ({ ...prev, [id]: { type: "idle" } }));
      throw err;
    }
  };

  const runHandoff = async () => {
    if (!selected) return;
    const area = selectedTeam?.area ?? selectedSeatOption?.area;
    if (!area) return;
    if (!planText) throw new Error("El jefe todavía no tiene un plan en el chat.");
    if (handoffTargets.length < 4) {
      throw new Error("Asigna Frontend, Backend, QA y Documentación en esta área.");
    }
    const plan = planText.slice(0, 6200);
    const results = await Promise.allSettled(
      handoffTargets.map((target) => {
        const targetPlan = intended[target.sessionId];
        const agent = targetPlan?.agent ?? TEAM_ROLE_METHODS[target.role] ?? meta[target.sessionId]?.agent;
        const definition = ROLE_BY_ID.get(target.role);
        const role = definition
          ? `${definition.title}: ${definition.handoff}`
          : "Trabaja solo en tu especialidad.";
        const text = `El jefe de ${area} ha cerrado el plan.\n\nTu rol: ${role}\n\nNo cambies de especialidad ni hagas el trabajo de otro rol.\n\nPLAN:\n${plan}${QUESTION_PROMPT_REMINDER}`;
        return promptSession(target.sessionId, {
          text,
          agent,
          model: targetPlan?.model
            ? { providerID: targetPlan.model.providerID, modelID: targetPlan.model.modelID }
            : undefined
        });
      })
    );
    const sent: typeof handoffTargets = [];
    const failed: string[] = [];
    results.forEach((result, index) => {
      const target = handoffTargets[index];
      if (result.status === "fulfilled") {
        sent.push(target);
      } else {
        const label = ROLE_BY_ID.get(target.role)?.title ?? target.role;
        failed.push(`${label}: ${errorMessage(result.reason)}`);
      }
    });
    setStatuses((prev) => {
      const next = { ...prev };
      for (const target of sent) next[target.sessionId] = { type: "busy" };
      return next;
    });
    if (sent.length > 0) {
      setTeamNotice(null);
      setHandoffCycle({
        area,
        jefe: selected,
        targets: sent.map((target) => target.sessionId),
        startedAt: Date.now()
      });
    }
    if (failed.length > 0) {
      throw new Error(`Plan enviado a ${sent.length}/4. Falló ${failed.join(" · ")}`);
    }
  };

  const handoffBusyTargets = handoffTargets.filter((target) => {
    const status = statuses[target.sessionId];
    return status?.type === "busy" || status?.type === "retry";
  });
  const handoffBusyLabel = handoffBusyTargets
    .map((target) => ROLE_BY_ID.get(target.role)?.title ?? target.role)
    .join(", ");
  const handoffArea = selectedTeam?.area ?? selectedSeatOption?.area;
  const handoff =
    (isTeamJefe || selectedSeatOption?.role === "plan") && handoffArea
      ? {
          disabled:
            !planText ||
            handoffTargets.length < 4 ||
            jefeReady !== true ||
            Boolean(jefePending),
          ready: jefeReady,
          hint: !planText
            ? "Primero cierra un plan con el jefe en el chat."
            : handoffTargets.length < 4
              ? "Asigna Frontend, Backend, QA y Documentación en esta área."
              : jefePending
                ? "Responde la pregunta pendiente del jefe antes de pasar el plan."
                : handoffBusyTargets.length > 0
                  ? `${handoffBusyLabel} está ocupado; el plan se enviará igualmente y puede quedar en cola.`
                  : jefeReady === null
                    ? "El jefe debe confirmar: LISTO PARA PASAR AL EQUIPO: SÍ."
                    : jefeReady === false
                      ? "El jefe indicó que aún NO está listo; resuelve las dudas pendientes."
                      : `Enviar el plan a Frontend, Backend, QA y Documentación de ${handoffArea}.`,
          onRun: runHandoff
        }
      : undefined;

  const removeSelected = async () => {
    if (!selected) return;
    const id = selected;
    await deleteSession(id);
    forgetSession(id);
    setTab("team");
  };

  const linkLabel =
    link === "live" ? "live" : link === "reconnecting" ? "reconectando" : link === "offline" ? "sin conexión" : "conectando";
  const linkClass = link === "live" ? "" : link === "offline" ? "off" : "warn";

  return (
    <div className="app" data-theme={theme}>
      <header className="topbar">
        <h1>PIXEL OFFICE</h1>
        <span className="sub">opencode · {boot?.directory ?? "sin directorio"}</span>
        <span className="spacer" />
        <button type="button" className="pill accent-btn" onClick={() => setModalOpen(true)}>
          + NUEVA SESI�N
        </button>
        <button type="button" className="pill theme-btn" onClick={() => setTeamModalOpen(true)}>
          CREAR EQUIPO
        </button>
        <button type="button" className="pill theme-btn" onClick={() => setLayoutOpen(true)}>
          EDITAR OFICINA
        </button>
        <button type="button" className="pill theme-btn" onClick={cycleTheme}>
          TEMA: {THEMES.find((item) => item.id === theme)?.label ?? "FUEGO"}
        </button>
        <button type="button" className="pill theme-btn" onClick={toggleBreaks}>
          PAUSAS: {breaksEnabled ? "SÍ" : "NO"}
        </button>
        <button
          type="button"
          className="pill theme-btn"
          onClick={toggleIndependent}
          title="Mostrar u ocultar programadores individuales"
        >
          INDEP: {showIndependent ? "SÍ" : "NO"}
        </button>
        <span className="pill">
          <span className={`dot ${linkClass}`} />
          {linkLabel}
        </span>
        <span className="pill">
          <span className={`dot ${liveConnected ? "" : "warn"}`} />
          sync
        </span>
        <span className="pill">
          <b>{sceneAgents.length}</b> {sceneAgents.length === 1 ? "agente" : "agentes"} · <b>{busyCount}</b>{" "}
          trabajando
        </span>
      </header>

      {opcDown && (
        <div className="banner">
          opencode no responde en <code>{opencodeUrl}</code>. Arráncalo con{" "}
          <code>opencode --port 4096</code>.
          <button type="button" className="btn ghost small" onClick={retryBootstrap}>
            Reintentar
          </button>
        </div>
      )}

      {bootFailed && !opcDown && (
        <div className="banner">
          No se pudo cargar la oficina desde la API.
          <button type="button" className="btn ghost small" onClick={retryBootstrap}>
            Reintentar
          </button>
        </div>
      )}

      {workerAlerts.length > 0 && (
        <div className="alerts" role="status" aria-live="polite">
          {workerAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`alert ${alert.kind}`}
              onClick={() => {
                setSelected(alert.sessionId);
                setTab("chat");
                dismissAlert(alert.id);
              }}
            >
              <span className="alert-text">{alert.text}</span>
              <button
                type="button"
                className="alert-close"
                aria-label="Cerrar alerta"
                onClick={(event) => {
                  event.stopPropagation();
                  dismissAlert(alert.id);
                }}
              >
                �
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="main">
        <div className="office">
          <SceneCanvas
            agents={sceneAgents}
            theme={theme}
            breaksEnabled={breaksEnabled}
            groupNames={groupNames}
            seatAssignments={seatAssignments}
            onSeatsChange={setSeatByAgent}
            pinnedAgents={teamPinnedAgents}
            selectedId={externalSelected?.id ?? (selected ? `oc:${selected}` : null)}
            onSelect={(id) => {
              if (id.startsWith("oc:")) {
                selectSession(id.slice(3));
                setExternalSelected(null);
                return;
              }
              const live = sceneAgents.find((agent) => agent.id === id);
              if (live) setExternalSelected(live);
            }}
          />
          {sceneAgents.length === 0 && (
            <div className="empty">
              {bootFailed || link === "offline" ? (
                <>
                  <h2>No se pudo cargar la oficina</h2>
                  <div>Comprueba que opencode responde y vuelve a intentarlo.</div>
                  <button type="button" className="btn primary" onClick={retryBootstrap}>
                    Reintentar
                  </button>
                </>
              ) : !boot ? (
                <>
                  <h2>Conectando⬦</h2>
                  <div>Cargando sesiones de opencode.</div>
                </>
              ) : (
                <>
                  <h2>La oficina está vacía</h2>
                  <div>
                    Pulsa <code>+ NUEVA SESI�N</code> o reporta agentes con <code>/api/agents/report</code>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <aside className="side">
          <div className="tabs">
            <button type="button" className={`tab ${tab === "team" ? "on" : ""}`} onClick={() => setTab("team")}>
              EQUIPO
            </button>
            <button
              type="button"
              className={`tab ${tab === "group" ? "on" : ""}`}
              onClick={() => {
                setGroupView(null);
                setTab("group");
              }}
            >
              GRUPO
            </button>
            <button
              type="button"
              className={`tab ${tab === "chat" ? "on" : ""}`}
              onClick={() => setTab("chat")}
              disabled={!selected}
            >
              SESI�N
            </button>
          </div>

          {tab === "team" ? (
            <>
              <div className="list">
                {showIndependent && liveAgents.map((agent) => {
                  const id = `live:${agent.agentId}`;
                  const chip =
                    agent.status === "idle"
                      ? "idle"
                      : agent.status === "error"
                        ? "error"
                        : agent.status === "thinking"
                          ? "retry"
                          : "busy";
                  return (
                    <div
                      key={id}
                      className={`row ${externalSelected?.id === id ? "sel" : ""}`}
                      onClick={() => setExternalSelected(sceneAgents.find((item) => item.id === id) ?? null)}
                    >
                      <span className={`chip ${chip}`} />
                      <span className="name">{agent.name}</span>
                      <span className="tag">live · {agent.status}</span>
                    </div>
                  );
                })}
                {visibleSessions.map((session) => {
                  const kind = statusKind(statuses[session.id], errors[session.id]);
                  const agentName = meta[session.id]?.agent ?? intended[session.id]?.agent;
                  const agentMode = agentName ? agentByName.get(agentName)?.mode : undefined;
                  return (
                    <div
                      key={session.id}
                      className={`row ${selected === session.id ? "sel" : ""}`}
                      onClick={() => selectSession(session.id)}
                    >
                      <span className={`chip ${kind}`} />
                      <span className="name">
                        {session.parentID ? "â⬠³ " : ""}
                        {nameFor(session)}
                      </span>
                      <span className="tag">{agentName ?? (session.parentID ? "sub" : "root")}</span>
                      {agentMode ? <span className={`tag mode-${agentMode}`}>{agentMode}</span> : null}
                    </div>
                  );
                })}
                {visibleSessions.length === 0 && <div className="hint">Sin sesiones registradas.</div>}
              </div>

              {selectedSession ? (
                <div className="detail">
                  <div className="title">{nameFor(selectedSession)}</div>
                  <div className="kv">
                    <span>id</span>
                    <b>{shortId(selectedSession.id)}</b>
                    <span>padre</span>
                    <b>{selectedSession.parentID ? shortId(selectedSession.parentID) : "�"}</b>
                    <span>estado</span>
                    <b>{selectedStatus?.type ?? "idle"}</b>
                    <span>método</span>
                    <select
                      className="seat-select"
                      value={chatAgent ?? ""}
                      onChange={(event) => {
                        if (selected) setSessionAgent(selected, event.target.value);
                      }}
                    >
                      {agents
                        .filter((agent) => !["compaction", "summary", "title"].includes(agent.name))
                        .map((agent) => (
                          <option key={agent.name} value={agent.name}>
                            {agent.name} · {agent.mode}
                          </option>
                        ))}
                    </select>
                    <span>modelo</span>
                    <ModelSelect
                      className="seat-select"
                      models={models}
                      value={selectedModelKey}
                      onChange={(value) => {
                        if (selected) setSessionModel(selected, value);
                      }}
                    />
                    <span>tokens</span>
                    <b>{selectedMeta?.tokens ?? "�"}</b>
                    <span>directorio</span>
                    <b>{selectedSession.directory}</b>
                    <span>manager</span>
                    <b>{selectedSession.id === managerId ? "sí" : "no"}</b>
                    <span>equipo</span>
                    <b>{selectedPinned ? "fijo en la oficina" : "libre"}</b>
                    <span>puesto</span>
                    <select
                      className="seat-select"
                      disabled={selectedPinned}
                      title={selectedPinned ? "El equipo está fijo en su oficina" : undefined}
                      value={assignedSeat !== undefined ? String(assignedSeat) : ""}
                      onChange={(event) => {
                        if (!selectedKey || selectedPinned) return;
                        const value = event.target.value;
                        assignSeat(selectedKey, value === "" ? null : Number(value));
                      }}
                    >
                      <option value="">
                        AUTO
                        {currentSeat !== undefined
                          ? ` · ${SEAT_OPTIONS[currentSeat]?.label ?? `Puesto ${currentSeat + 1}`}`
                          : ""}
                      </option>
                      {SEAT_OPTIONS.map((option) => {
                        const owner = seatOwners.get(option.index);
                        const busy = owner !== undefined && owner !== selectedKey;
                        return (
                          <option key={option.index} value={option.index} disabled={busy}>
                            {option.label}
                            {busy ? " · ocupado" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {selectedTeam && (
                    <>
                      <button type="button" className="btn ghost wide" onClick={useGoForTeam}>
                        USAR OPENCODE GO EN EL EQUIPO
                      </button>
                      {teamNotice && <div className="hint">{teamNotice}</div>}
                    </>
                  )}

                  {canAssignManager && selectedSession.id !== managerId && (
                    <button
                      type="button"
                      className="btn ghost wide"
                      onClick={() => assignManager(selectedSession.id)}
                    >
                      HACER MANAGER
                    </button>
                  )}

                  {selectedActivity && (
                    <div className="tool">
                      {selectedActivity.tool} · {selectedActivity.status}
                      {selectedActivity.title ? <div>{selectedActivity.title}</div> : null}
                    </div>
                  )}

                  {selectedDiff && (
                    <div className="tool">
                      diff · +{selectedDiff.additions} / -{selectedDiff.deletions} · {selectedDiff.files} archivos
                    </div>
                  )}

                  {selectedPermission && <div className="warnbox">permiso pendiente: {selectedPermission}</div>}
                  {selectedError && (
                    <ErrorBox message={selectedError} action={selectedRegionalAction} />
                  )}

                  <button type="button" className="btn primary wide" onClick={() => setTab("chat")}>
                    Abrir chat de esta sesión
                  </button>
                </div>
              ) : (
                <div className="hint">
                  Haz clic en un personaje o en una fila para ver el detalle.
                  <br />
                  <br />
                  Usa <b>+ NUEVA SESI�N</b> para crear un agente y darle instrucciones.
                </div>
              )}
            </>
          ) : tab === "group" ? (
            <GroupPanel
              teams={detectedTeams.teams}
              activeArea={groupView ?? undefined}
              groupNames={groupNames}
              sessions={sessions}
              statuses={statuses}
              errors={errors}
              personName={(id) => characters[id]?.name?.trim() ?? ""}
              onRename={renameGroup}
              onRenamePerson={renamePerson}
              onOpen={openGroup}
              onBack={() => setGroupView(null)}
              onSelect={(id) => {
                setSelected(id);
                setTab("chat");
              }}
            />
          ) : (
            <SessionChat
              session={selectedSession}
              messages={chatMessages}
              busy={selectedBusy}
              busyLabel={chatBusyLabel}
              sessionError={selectedError}
              onRegionalFallback={() => (selected ? useRegionalModel(selected) : false)}
              onGoFallback={selectedTeam ? useGoForTeam : undefined}
              agent={chatAgent}
              model={chatModel}
              name={selectedSession ? nameFor(selectedSession) : undefined}
              role={selectedRoleLabel}
              onEdit={() => selected && setEditingCharacter(selected)}
              handoff={handoff}
              onSend={sendPrompt}
              onAbort={async () => {
                if (selected) await abortSession(selected);
              }}
              onDelete={removeSelected}
            />
          )}
        </aside>
      </div>

      {modalOpen && (
        <NewSessionModal
          agents={agents}
          models={models}
          onClose={() => setModalOpen(false)}
          onCreate={createAgentSession}
        />
      )}

      {teamModalOpen && (
        <TeamModal
          agents={agents}
          models={models}
          areas={teamAreas}
          onClose={() => setTeamModalOpen(false)}
          onCreate={createTeam}
        />
      )}

      {layoutOpen && <LayoutEditor onClose={() => setLayoutOpen(false)} />}

      {editingCharacter && sessions[editingCharacter] && (
        <CharacterModal
          title={nameFor(sessions[editingCharacter])}
          current={characters[editingCharacter] ?? {}}
          onClose={() => setEditingCharacter(null)}
          onSave={(look) => {
            setCharacters((prev) => ({ ...prev, [editingCharacter]: look }));
            setEditingCharacter(null);
          }}
        />
      )}

      <AgentPanel agent={externalSelected} onClose={() => setExternalSelected(null)} />
    </div>
  );
}
