import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { AgentInfo, ModelInfo } from "../types";

const INTERNAL = new Set(["compaction", "summary", "title"]);

type Props = {
  agents: AgentInfo[];
  models: ModelInfo[];
  onClose: () => void;
  onCreate: (input: {
    agent: string;
    model?: { providerID: string; modelID: string };
    title: string;
    text: string;
  }) => Promise<void>;
};

function bashSummary(agent: AgentInfo): string {
  return `bash: ${agent.permission?.bash ?? "—"}`;
}

function AgentCard({
  agent,
  selected,
  onSelect
}: {
  agent: AgentInfo;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" className={`agent-card ${selected ? "on" : ""}`} onClick={onSelect}>
      <div className="agent-card-head">
        <span className="agent-name">{agent.name}</span>
        <span className={`agent-mode ${agent.mode}`}>{agent.mode}</span>
      </div>
      {agent.description ? <div className="agent-desc">{agent.description}</div> : null}
      <div className="agent-perms">
        <span className={`perm edit-${agent.permission?.edit ?? "none"}`}>edit: {agent.permission?.edit ?? "—"}</span>
        <span className="perm">{bashSummary(agent)}</span>
      </div>
    </button>
  );
}

export default function NewSessionModal({ agents, models, onClose, onCreate }: Props) {
  const visible = agents.filter((agent) => !INTERNAL.has(agent.name));
  const primaries = visible.filter((agent) => agent.mode !== "subagent");
  const subagents = visible.filter((agent) => agent.mode === "subagent");

  const [agent, setAgent] = useState(
    () =>
      primaries.find((item) => item.name === "orquestador")?.name ??
      primaries[0]?.name ??
      subagents[0]?.name ??
      ""
  );
  const [modelKey, setModelKey] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, ModelInfo[]>();
    for (const model of models) {
      const list = map.get(model.providerName) ?? [];
      list.push(model);
      map.set(model.providerName, list);
    }
    return [...map.entries()];
  }, [models]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!agent) {
      setError("Elige un tipo de agente.");
      return;
    }
    if (!text.trim()) {
      setError("Escribe la primera instrucción.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let model: { providerID: string; modelID: string } | undefined;
      if (modelKey) {
        const [providerID, modelID] = modelKey.split("::");
        if (providerID && modelID) model = { providerID, modelID };
      }
      await onCreate({ agent, model, title: title.trim(), text: text.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={busy ? undefined : onClose}>
      <form className="modal" onClick={(event) => event.stopPropagation()} onSubmit={submit}>
        <header className="modal-head">
          <h2>NUEVA SESIÓN</h2>
          <button type="button" className="icon-btn" onClick={onClose} disabled={busy}>
            ×
          </button>
        </header>

        <div className="modal-body">
          <p className="modal-note">
            Elige el tipo de agente y dale una instrucción. Cada sesión tiene su propio contexto y su
            escritorio en la oficina.
          </p>

          {primaries.length > 0 && (
            <section>
              <h3>Agentes</h3>
              <div className="agent-grid">
                {primaries.map((item) => (
                  <AgentCard
                    key={item.name}
                    agent={item}
                    selected={agent === item.name}
                    onSelect={() => setAgent(item.name)}
                  />
                ))}
              </div>
            </section>
          )}

          {subagents.length > 0 && (
            <section>
              <h3>Subagentes (para delegación)</h3>
              <div className="agent-grid">
                {subagents.map((item) => (
                  <AgentCard
                    key={item.name}
                    agent={item}
                    selected={agent === item.name}
                    onSelect={() => setAgent(item.name)}
                  />
                ))}
              </div>
            </section>
          )}

          <div className="modal-row">
            <label>
              Modelo
              <select value={modelKey} onChange={(event) => setModelKey(event.target.value)}>
                <option value="">El del agente (por defecto)</option>
                {grouped.map(([provider, list]) => (
                  <optgroup key={provider} label={provider}>
                    {list.map((model) => (
                      <option key={`${model.providerID}::${model.modelID}`} value={`${model.providerID}::${model.modelID}`}>
                        {model.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <label>
              Título (opcional)
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Se toma de la instrucción"
                maxLength={120}
              />
            </label>
          </div>

          <label className="modal-block">
            Primera instrucción
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Ej.: Lee la carpeta demo y dime qué contiene cada archivo."
              rows={4}
              maxLength={8000}
            />
          </label>

          <div className="modal-warning">
            Los agentes actúan con sus permisos: pueden leer, editar archivos y ejecutar comandos según
            su configuración. Revisa los badges de cada tarjeta.
          </div>

          {error && <div className="errbox">{error}</div>}
        </div>

        <footer className="modal-foot">
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" className="btn primary" disabled={busy || !agent}>
            {busy ? "Creando…" : "Crear y enviar"}
          </button>
        </footer>
      </form>
    </div>
  );
}
