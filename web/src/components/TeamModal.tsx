import { useState } from "react";
import type { FormEvent } from "react";
import type { AgentInfo, ModelInfo } from "../types";
import type { SeatRole } from "../scene/occupancy";
import { TEAM_ROLE_DEFS } from "../teamRoles";
import ModelSelect from "./ModelSelect";
import ErrorBox from "./ErrorBox";

type AreaOption = { name: string; available: boolean; reason?: string };
type Method = "plan" | "build";


type Props = {
  agents: AgentInfo[];
  models: ModelInfo[];
  areas: AreaOption[];
  onClose: () => void;
  onCreate: (input: {
    area: string;
    roles: Array<{ role: SeatRole; method: Method; model: string }>;
  }) => Promise<void>;
};

export default function TeamModal({ agents, models, areas, onClose, onCreate }: Props) {
  const methods = (["plan", "build"] as Method[]).filter((name) =>
    agents.some((agent) => agent.name === name)
  );
  const [area, setArea] = useState(() => areas.find((item) => item.available)?.name ?? areas[0]?.name ?? "");
  const [methodsByRole, setMethodsByRole] = useState<Record<SeatRole, Method>>({
    plan: methods.includes("plan") ? "plan" : "build",
    frontend: "build",
    backend: "build",
    qa: "build",
    docs: "build"
  });
  const [modelsByRole, setModelsByRole] = useState<Record<SeatRole, string>>({
    plan: "",
    frontend: "",
    backend: "",
    qa: "",
    docs: ""
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedArea = areas.find((item) => item.name === area);
  const canCreate = Boolean(area && selectedArea?.available && methods.length > 0);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canCreate) {
      setError(selectedArea?.reason ?? "Elige un área con los cinco puestos libres.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onCreate({
        area,
        roles: TEAM_ROLE_DEFS.map((definition) => ({
          role: definition.role,
          method: methodsByRole[definition.role],
          model: modelsByRole[definition.role]
        }))
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={busy ? undefined : onClose}>
      <form className="modal" onClick={(event) => event.stopPropagation()} onSubmit={submit}>
        <header className="modal-head">
          <h2>CREAR EQUIPO</h2>
          <button type="button" className="icon-btn" onClick={onClose} disabled={busy}>
            ✕
          </button>
        </header>

        <div className="modal-body">
          <p className="modal-note">
            Crea las cinco sesiones del área y las asigna a Jefe, Frontend, Backend, QA y
            Documentación. El equipo queda fijo en esa oficina (asientos bloqueados, sin pausas ni
            traslados). El jefe trabaja en el método elegido; los demás quedan esperando hasta que
            uses <b>PASAR PLAN</b>. Los modelos de <b>OpenCode Go</b> requieren región Global;
            los del proveedor <b>OpenCode</b> son pago por uso y necesitan saldo.
          </p>

          <div className="modal-row">
            <label>
              Área
              <select value={area} onChange={(event) => setArea(event.target.value)}>
                {areas.map((item) => (
                  <option key={item.name} value={item.name} disabled={!item.available}>
                    {item.name}
                    {item.available ? "" : " · puestos ocupados"}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {TEAM_ROLE_DEFS.map((definition) => (
            <section key={definition.role}>
              <h3>{definition.title}</h3>
              <p className="role-brief">{definition.brief}</p>
              <div className="modal-row">
                <label>
                  Método de trabajo
                  <select
                    value={methodsByRole[definition.role]}
                    onChange={(event) =>
                      setMethodsByRole((prev) => ({
                        ...prev,
                        [definition.role]: event.target.value as Method
                      }))
                    }
                  >
                    {methods.map((method) => (
                      <option key={method} value={method}>
                        {method === "plan" ? "Plan · solo lectura" : "Build · puede editar"}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Modelo de IA
                  <ModelSelect
                    models={models}
                    value={modelsByRole[definition.role]}
                    onChange={(value) =>
                      setModelsByRole((prev) => ({ ...prev, [definition.role]: value }))
                    }
                  />
                </label>
              </div>
            </section>
          ))}

          {selectedArea && !selectedArea.available && (
            <div className="modal-warning">{selectedArea.reason ?? "El área ya tiene puestos ocupados."}</div>
          )}

          {methods.length === 0 && (
            <div className="modal-warning">No hay agentes `plan` ni `build` disponibles.</div>
          )}

          {error && <ErrorBox message={error} />}
        </div>

        <footer className="modal-foot">
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" className="btn primary" disabled={busy || !canCreate}>
            {busy ? "Creando equipo…" : "Crear equipo"}
          </button>
        </footer>
      </form>
    </div>
  );
}
