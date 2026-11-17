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
import { useAgentSync } from "./useAgentSync";
import type { SceneAgent, SceneStatus } from "./scene/sprites";
import type { ThemeName } from "./office/sprites";
import NewSessionModal from "./components/NewSessionModal";
import SessionChat from "./components/SessionChat";
import CharacterModal from "./components/CharacterModal";
import { type CharacterLook, loadCharacters, saveCharacters } from "./characters";
import { displayTitle } from "./format";

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

function textOf(parts: ChatPart[]): string {
  return parts
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("");
}

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
  const [intended, setIntended] = useState<Record<string, { agent?: string; model?: ModelInfo }>>({});
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [link, setLink] = useState<"connecting" | "live" | "reconnecting" | "offline">("connecting");
  const [theme, setTheme] = useState<ThemeName>(initialTheme);
  const [spawned, setSpawned] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<"team" | "chat">("team");
  const [modalOpen, setModalOpen] = useState(false);
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

  bootFailedRef.current = bootFailed;

  const cycleTheme = () => {
    setTheme((current) => {
      const index = THEMES.findIndex((item) => item.id === current);
      const next = THEMES[(index + 1) % THEMES.length].id;
      window.localStorage.setItem("pixel-office-theme", next);
      return next;
    });
  };

  const retryBootstrap = () => {
    setBootFailed(false);
    setBootTick((current) => current + 1);
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
      setBootTick((current) => current + 1);
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
      const error = props.error?.name ?? "error";
      setErrors((prev) => ({ ...prev, [sessionID]: error }));
      return;
    }

    if (type === "message.updated") {
      const info = props.info;
      if (!info?.sessionID) return;
      if (!sessionAllowed(info.sessionID)) return;
      setErrors((prev) => {
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
  const busyCount =
    allSessions.filter((s) => statuses[s.id]?.type === "busy" || permissions[s.id]).length +
    liveAgents.filter((agent) => agent.status !== "idle").length;
  const agentByName = useMemo(() => new Map(agents.map((agent) => [agent.name, agent])), [agents]);
  const managerId = useMemo(() => {
    const roots = Object.values(sessions).filter((session) => !session.parentID || !sessions[session.parentID]);
    const priority = ["orquestador", "plan", "build"];
    const preferred = priority
      .map((name) => roots.find((session) => meta[session.id]?.agent === name || intended[session.id]?.agent === name))
      .find(Boolean);
    return preferred?.id ?? roots.sort((a, b) => a.time.created - b.time.created)[0]?.id ?? null;
  }, [sessions, meta, intended]);

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
  const chatAgent = selectedIntended?.agent ?? selectedMeta?.agent;
  const chatModel = selectedIntended?.model?.modelID ?? selectedMeta?.model;
  const chatMessages = selected ? transcripts[selected] ?? [] : [];

  const selectSession = (id: string) => {
    setSelected(id);
    setTab("chat");
  };

  const nameFor = (session: Session) => characters[session.id]?.name?.trim() || displayTitle(session.title);

  const sceneAgents = useMemo<SceneAgent[]>(() => {
    const list: SceneAgent[] = liveAgents.map((agent) => ({
      id: `live:${agent.agentId}`,
      name: agent.name,
      status: agent.status,
      task: agent.currentTask,
      file: agent.file,
      logs: agent.logs.map((log) => log.message)
    }));

    for (const session of allSessions) {
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
  }, [liveAgents, allSessions, statuses, activity, errors, permissions, transcripts, characters, meta, spawned, managerId]);

  useEffect(() => {
    setExternalSelected((current) =>
      current && !sceneAgents.some((agent) => agent.id === current.id) ? null : current
    );
  }, [sceneAgents]);

  const createAgentSession = async (input: {
    agent: string;
    model?: { providerID: string; modelID: string };
    title: string;
    text: string;
  }) => {
    const title =
      input.title || input.text.replace(/\s+/g, " ").slice(0, 48).trim() || `Sesión ${new Date().toISOString().slice(11, 19)}`;
    const session = await createSession(title);
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

  const sendPrompt = async (text: string) => {
    if (!selected) return;
    await promptSession(selected, {
      text,
      agent: chatAgent,
      model: selectedIntended?.model
        ? { providerID: selectedIntended.model.providerID, modelID: selectedIntended.model.modelID }
        : undefined
    });
  };

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
          + NUEVA SESIÓN
        </button>
        <button type="button" className="pill theme-btn" onClick={cycleTheme}>
          TEMA: {THEMES.find((item) => item.id === theme)?.label ?? "FUEGO"}
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

      <div className="main">
        <div className="office">
          <SceneCanvas
            agents={sceneAgents}
            theme={theme}
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
                  <h2>Conectando…</h2>
                  <div>Cargando sesiones de opencode.</div>
                </>
              ) : (
                <>
                  <h2>La oficina está vacía</h2>
                  <div>
                    Pulsa <code>+ NUEVA SESIÓN</code> o reporta agentes con <code>/api/agents/report</code>
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
              className={`tab ${tab === "chat" ? "on" : ""}`}
              onClick={() => setTab("chat")}
              disabled={!selected}
            >
              SESIÓN
            </button>
          </div>

          {tab === "team" ? (
            <>
              <div className="list">
                {liveAgents.map((agent) => {
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
                {allSessions.map((session) => {
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
                        {session.parentID ? "↳ " : ""}
                        {nameFor(session)}
                      </span>
                      <span className="tag">{agentName ?? (session.parentID ? "sub" : "root")}</span>
                      {agentMode ? <span className={`tag mode-${agentMode}`}>{agentMode}</span> : null}
                    </div>
                  );
                })}
                {allSessions.length === 0 && <div className="hint">Sin sesiones registradas.</div>}
              </div>

              {selectedSession ? (
                <div className="detail">
                  <div className="title">{nameFor(selectedSession)}</div>
                  <div className="kv">
                    <span>id</span>
                    <b>{shortId(selectedSession.id)}</b>
                    <span>padre</span>
                    <b>{selectedSession.parentID ? shortId(selectedSession.parentID) : "—"}</b>
                    <span>estado</span>
                    <b>{selectedStatus?.type ?? "idle"}</b>
                    <span>agente</span>
                    <b>{chatAgent ?? "—"}</b>
                    <span>modelo</span>
                    <b>{chatModel ?? "—"}</b>
                    <span>tokens</span>
                    <b>{selectedMeta?.tokens ?? "—"}</b>
                    <span>directorio</span>
                    <b>{selectedSession.directory}</b>
                  </div>

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
                  {selectedError && <div className="errbox">error: {selectedError}</div>}

                  <button type="button" className="btn primary wide" onClick={() => setTab("chat")}>
                    Abrir chat de esta sesión
                  </button>
                </div>
              ) : (
                <div className="hint">
                  Haz clic en un personaje o en una fila para ver el detalle.
                  <br />
                  <br />
                  Usa <b>+ NUEVA SESIÓN</b> para crear un agente y darle instrucciones.
                </div>
              )}
            </>
          ) : (
            <SessionChat
              session={selectedSession}
              messages={chatMessages}
              busy={selectedBusy}
              agent={chatAgent}
              model={chatModel}
              name={selectedSession ? nameFor(selectedSession) : undefined}
              onEdit={() => selected && setEditingCharacter(selected)}
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
