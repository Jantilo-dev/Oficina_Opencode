import type { SceneAgent } from "./sprites";

type Props = {
  agent: SceneAgent | null;
  onClose: () => void;
};

const STATUS_LABEL: Record<SceneAgent["status"], string> = {
  idle: "idle",
  thinking: "pensando",
  coding: "programando",
  running_tool: "ejecutando",
  talking: "conversando",
  error: "error"
};

export default function AgentPanel({ agent, onClose }: Props) {
  if (!agent) return null;
  return (
    <aside className="agent-panel">
      <header className="agent-panel-head">
        <span>AGENTE · {agent.name}</span>
        <button type="button" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
      </header>
      <div className="agent-panel-body">
        <div className="agent-row">
          <span>estado</span>
          <b className={`agent-status ${agent.status}`}>{STATUS_LABEL[agent.status]}</b>
        </div>
        <div className="agent-row">
          <span>tarea</span>
          <b>{agent.task ?? "—"}</b>
        </div>
        <div className="agent-row">
          <span>archivo</span>
          <b>{agent.file ?? "—"}</b>
        </div>
        <div className="agent-logs-title">LOGS</div>
        <div className="agent-logs">
          {agent.logs.length === 0 && <div className="agent-log muted">Sin actividad todavía.</div>}
          {agent.logs.slice(-10).map((log, index) => (
            <div key={index} className="agent-log">
              <span>›</span> {log}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
