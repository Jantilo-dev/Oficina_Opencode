import type { Session } from "../types";

export type Slot = { x: number; y: number; scale: number; dir?: 1 | -1 };
export type RoomLabel = { x: number; y: number; text: string };
export type DeskPod = { x: number; y: number; length: number; width: number; slots: Slot[] };

export type OfficeLayout = {
  slots: Map<string, Slot>;
  labels: RoomLabel[];
  pods: DeskPod[];
  width: number;
  height: number;
};

function vpod(x: number, y: number, count: number, double = false): DeskPod {
  const gap = 95;
  const length = count === 1 && !double ? 90 : count * gap + 20;
  const slots: Slot[] = [];
  for (let index = 0; index < count; index++) {
    const sy = y + (count === 1 && !double ? 42 : 30 + index * gap);
    slots.push({ x: x - (double ? 85 : 54), y: sy, scale: 1, dir: 1 });
    if (double) slots.push({ x: x + 85, y: sy, scale: 1, dir: -1 });
  }
  return { x, y, length, width: double ? 150 : 80, slots };
}

export const PODS: DeskPod[] = [
  vpod(200, 250, 1, false),
  vpod(500, 420, 4, true),
  vpod(760, 420, 4, true),
  vpod(1100, 420, 3, true),
  vpod(320, 850, 2, true),
  vpod(650, 850, 2, true),
  vpod(980, 850, 2, true)
];

const LABELS: RoomLabel[] = [
  { x: 170, y: 170, text: "GERENCIA" },
  { x: 480, y: 195, text: "SALA DE JUNTAS" },
  { x: 960, y: 195, text: "COCINA" },
  { x: 170, y: 438, text: "RECEPCIÓN" },
  { x: 1100, y: 435, text: "ANEXO" },
  { x: 1040, y: 735, text: "BAÑOS" },
  { x: 640, y: 830, text: "OFICINA 2" },
  { x: 170, y: 690, text: "COPIAS" }
];

export function computeLayout(sessions: Session[], managerId?: string | null): OfficeLayout {
  const ids = new Set(sessions.map((session) => session.id));
  const byId = new Map(sessions.map((session) => [session.id, session]));

  const rootOf = (session: Session): string => {
    let current = session;
    const guard = new Set<string>();
    while (current.parentID && ids.has(current.parentID) && !guard.has(current.id)) {
      guard.add(current.id);
      const parent = byId.get(current.parentID);
      if (!parent) break;
      current = parent;
    }
    return current.id;
  };

  const groups = new Map<string, Session[]>();
  for (const session of sessions) {
    const root = rootOf(session);
    const group = groups.get(root) ?? [];
    group.push(session);
    groups.set(root, group);
  }

  const roots = sessions
    .filter((session) => session.id === rootOf(session))
    .sort((a, b) => a.time.created - b.time.created);

  const managerIndex = managerId ? roots.findIndex((session) => session.id === managerId) : -1;
  if (managerIndex > 0) {
    const [manager] = roots.splice(managerIndex, 1);
    roots.unshift(manager);
  }

  const free = PODS.flatMap((deskPod) => deskPod.slots).map((slot) => ({ ...slot }));
  const slots = new Map<string, Slot>();

  const takeNearest = (target?: Slot): Slot | undefined => {
    if (free.length === 0) return undefined;
    if (!target) return free.shift();
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    free.forEach((slot, index) => {
      const distance = Math.hypot(slot.x - target.x, slot.y - target.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    return free.splice(bestIndex, 1)[0];
  };

  for (const root of roots) {
    const slot = takeNearest();
    if (slot) slots.set(root.id, slot);
  }

  for (const root of roots) {
    const parentSlot = slots.get(root.id);
    const children = (groups.get(root.id) ?? []).filter((session) => session.id !== root.id);
    for (const child of children) {
      const slot = takeNearest(parentSlot);
      if (slot) slots.set(child.id, { ...slot, scale: 0.82 });
    }
  }

  let overflow = 0;
  for (const session of sessions) {
    if (slots.has(session.id)) continue;
    slots.set(session.id, {
      x: 400 + (overflow % 4) * 150,
      y: 820,
      scale: 0.78
    });
    overflow += 1;
  }

  return { slots, labels: LABELS, pods: PODS, width: 1280, height: 1080 };
}
