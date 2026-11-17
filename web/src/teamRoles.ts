import type { SeatRole } from "./scene/occupancy";

export type TeamRoleDef = {
  role: SeatRole;
  title: string;
  brief: string;
  handoff: string;
};

export const TEAM_ROLE_DEFS: TeamRoleDef[] = [
  {
    role: "plan",
    title: "PLANIFICACIÓN (JEFE)",
    brief:
      "Resuelve todas las dudas y preguntas del usuario, cierra el alcance, define criterios de aceptación y divide el trabajo por rol. No respondas que estás en modo plan ni en solo lectura. Declara readiness con LISTO PARA PASAR AL EQUIPO: SÍ/NO. No implementes código.",
    handoff:
      "Resuelve dudas y coordina el plan con el usuario; no implementes código ni cambies de especialidad."
  },
  {
    role: "frontend",
    title: "FRONTEND",
    brief:
      "Construye la interfaz: componentes, botones, formularios, estilos, estados y consumo de la API. No implementes lógica de negocio ni base de datos.",
    handoff:
      "Implementa la parte visual del plan: pantallas, botones, formularios, estilos, estados y llamadas a la API. No implementes lógica de negocio."
  },
  {
    role: "backend",
    title: "BACKEND",
    brief:
      "Diseña e implementa endpoints, validaciones, reglas de negocio, persistencia y seguridad. No maquetes interfaces.",
    handoff:
      "Implementa la lógica del plan: endpoints, validaciones, reglas de negocio, base de datos e integraciones. No maquetes UI."
  },
  {
    role: "qa",
    title: "QA",
    brief:
      "Define casos de prueba, criterios de aceptación, casos límite y regresiones; valida el trabajo de Frontend y Backend.",
    handoff:
      "Valida el plan y el trabajo de Frontend/Backend: casos de prueba, criterios de aceptación, casos límite y regresiones. Reporta fallos con evidencia."
  },
  {
    role: "docs",
    title: "DOCUMENTACIÓN",
    brief:
      "Documenta arquitectura, API, decisiones, uso y pasos Scrum; mantén trazabilidad y criterios del proyecto.",
    handoff:
      "Convierte el plan y el resultado en documentación: arquitectura, API, decisiones, uso y pasos Scrum. Mantén trazabilidad."
  }
];

export const ROLE_BY_ID = new Map(TEAM_ROLE_DEFS.map((definition) => [definition.role, definition]));

export const TEAM_ROLE_METHODS: Record<SeatRole, "plan" | "build"> = {
  plan: "plan",
  frontend: "build",
  backend: "build",
  qa: "build",
  docs: "build"
};

export const JEFE_DONE_TEXT = "El pedido ya está hecho, favor revisar para seguir con lo demás.";

export function readJefeReadiness(text: string): boolean | null {
  const match = text.match(
    /LISTO\s+PARA\s+(?:PASAR|ENTREGAR)(?:\s+LA\s+INFORMACI[ÓO]N)?(?:\s+AL\s+EQUIPO)?\s*[:=]\s*\**\s*(S[IÍ]|NO)(?![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/i
  );
  if (!match) return null;
  return match[1].toUpperCase().startsWith("S");
}