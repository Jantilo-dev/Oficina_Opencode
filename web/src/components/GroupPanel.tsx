import type { Session, SessionStatus } from "../types";
import type { SeatRole } from "../scene/occupancy";
import { TEAM_ROLE_DEFS } from "../teamRoles";

type Team = { area: string; roles: Map<SeatRole, string> };

const ROLE_SHORT: Record<SeatRole, string> = {
  plan: "JEFE",
  frontend: "FRONTEND",
  backend: "BACKEND",
  qa: "QA",
  docs: "DOCUMENTACIÓN"
};

type Props = {
  teams: Team[];
  activeArea?: string;
  groupNames: Record<string, string>;
  sessions: Record<string, Session>;
  statuses: Record<string, SessionStatus>;
  errors: Record<string, string>;
  personName: (id: string) => string;
  onRename: (area: string, name: string) => void;
  onRenamePerson: (id: string, name: string) => void;
  onOpen: (area: string) => void;
  onBack: () => void;
  onSelect: (id: string) => void;
};

function statusOf(id: string | undefined, statuses: Record<string, SessionStatus>, errors: Record<string, string>) {
  if (!id) return "idle";
  if (errors[id]) return "error";
  return statuses[id]?.type === "busy" || statuses[id]?.type === "retry" ? statuses[id]?.type : "idle";
}

export default function GroupPanel({
  teams,
  activeArea,
  groupNames,
  sessions,
  statuses,
  errors,
  personName,
  onRename,
  onRenamePerson,
  onOpen,
  onBack,
  onSelect
}: Props) {
  const team = activeArea ? teams.find((item) => item.area === activeArea) : undefined;

  if (!team) {
    return (
      <div className="group-panel">
        <div className="group-heading">GRUPOS</div>
        {teams.length === 0 && <div className="hint">Todavía no hay grupos completos.</div>}
        {teams.map((item) => {
          const name = groupNames[item.area]?.trim() || "SIN NOMBRE";
          const people = TEAM_ROLE_DEFS.map((definition) => {
            const id = item.roles.get(definition.role);
            return id ? personName(id) || "Sin nombre" : "Sin asignar";
          }).join(" · ");
          return (
            <button key={item.area} type="button" className="group-card" onClick={() => onOpen(item.area)}>
              <span className="group-card-name">{name}</span>
              <span className="group-card-people">{people}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="group-panel">
      <div className="group-detail-head">
        <button type="button" className="group-back" onClick={onBack}>
          ← GRUPOS
        </button>
        <span className="group-heading">GRUPO</span>
      </div>
      <label className="group-name-field">
        Nombre del grupo
        <input
          value={groupNames[team.area] ?? ""}
          onChange={(event) => onRename(team.area, event.target.value)}
          placeholder="SIN NOMBRE"
          maxLength={32}
        />
      </label>
      <div className="group-members">
        {TEAM_ROLE_DEFS.map((definition) => {
          const id = team.roles.get(definition.role);
          const session = id ? sessions[id] : undefined;
          const kind = statusOf(id, statuses, errors);
          return (
            <div key={definition.role} className={`group-member ${id === undefined ? "empty" : ""}`}>
              <span className={`chip ${kind}`} />
              <input
                className="group-person-input"
                value={id ? personName(id) : ""}
                placeholder={session ? "Nombre" : "Sin asignar"}
                disabled={!id}
                maxLength={24}
                onChange={(event) => {
                  if (id) onRenamePerson(id, event.target.value);
                }}
              />
              <span className="group-role">{ROLE_SHORT[definition.role]}</span>
              <span className={`group-state ${kind}`}>{kind}</span>
              <button
                type="button"
                className="group-open"
                disabled={!id}
                onClick={() => id && onSelect(id)}
              >
                CHAT
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
