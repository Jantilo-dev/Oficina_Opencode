import { CAFE_SPOTS, HALL_SPOTS, WORKSTATIONS, type Workstation } from "./sprites";

export type Point = { x: number; y: number };
export type SpotKind = "hall" | "corridor" | "meeting" | "break" | "overflow";

export type Spot = {
  id: string;
  x: number;
  y: number;
  kind: SpotKind;
  gender?: "male" | "female";
};

export type Seat = {
  id: string;
  index: number;
  seatX: number;
  seatY: number;
  workstation: Workstation;
};

export type BreakMode = "normal" | "fast" | "demo" | "off";

export type Placement = {
  seat: number | null;
  spot: number | null;
  meeting: number | null;
  breakSpot: number | null;
  mode: "desk" | "stand" | "meeting" | "break";
  destination: string | null;
  nextBreakAt: number;
  breakEndsAt: number;
};

export type Motion = {
  x: number;
  y: number;
  path: Point[];
};

export const SEATS: Seat[] = WORKSTATIONS.map((workstation, index) => ({
  id: `seat-${index}`,
  index,
  seatX: workstation.seatX,
  seatY: workstation.seatY,
  workstation
}));

export function makeSpot(id: string, x: number, y: number, kind: SpotKind, gender?: "male" | "female"): Spot {
  return { id, x, y, kind, gender };
}

export const MEETING_SPOTS: Spot[] = [
  makeSpot("meeting-0", 470, 720, "meeting"),
  makeSpot("meeting-1", 540, 720, "meeting"),
  makeSpot("meeting-2", 610, 720, "meeting"),
  makeSpot("meeting-3", 680, 720, "meeting"),
  makeSpot("meeting-4", 500, 920, "meeting"),
  makeSpot("meeting-5", 570, 920, "meeting"),
  makeSpot("meeting-6", 640, 920, "meeting"),
  makeSpot("meeting-7", 710, 920, "meeting")
];

export const HALL_AND_CORRIDOR_SPOTS: Spot[] = [
  ...HALL_SPOTS.slice(4).map((spot, index) => makeSpot(`hall-${index}`, spot.x, spot.y, "hall")),
  makeSpot("hall-6", 880, 780, "hall"),
  makeSpot("hall-7", 900, 910, "hall"),
  makeSpot("hall-8", 1100, 800, "hall"),
  makeSpot("hall-9", 1150, 880, "hall"),
  makeSpot("hall-10", 1000, 675, "hall"),
  makeSpot("hall-11", 1100, 700, "hall"),
  makeSpot("hall-12", 1180, 900, "hall"),
  makeSpot("hall-13", 940, 690, "hall"),
  makeSpot("corridor-0", 415, 280, "corridor"),
  makeSpot("corridor-1", 415, 500, "corridor"),
  makeSpot("corridor-2", 415, 700, "corridor"),
  makeSpot("corridor-3", 415, 880, "corridor"),
  makeSpot("corridor-4", 815, 280, "corridor"),
  makeSpot("corridor-5", 815, 500, "corridor"),
  makeSpot("corridor-6", 815, 700, "corridor"),
  makeSpot("corridor-7", 815, 880, "corridor")
];

export const BREAK_SPOTS: Spot[] = [
  ...CAFE_SPOTS.map((spot, index) => makeSpot(`cafe-${index}`, spot.x, spot.y, "break")),
  makeSpot("water-0", 150, 790, "break"),
  makeSpot("water-1", 250, 880, "break"),
  makeSpot("water-2", 320, 900, "break"),
  makeSpot("bath-0", 940, 380, "break", "male"),
  makeSpot("bath-1", 1010, 380, "break", "male"),
  makeSpot("bath-2", 1080, 380, "break", "female"),
  makeSpot("bath-3", 1160, 380, "break", "female")
];

export const STANDING_SPOTS: Spot[] = [...HALL_AND_CORRIDOR_SPOTS];

export function overflowSpot(index: number): Point {
  const columns = 16;
  return {
    x: 858 + (index % columns) * 24,
    y: 646 + Math.floor(index / columns) * 20
  };
}

export function hashOf(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash;
}

export function breakMode(): BreakMode {
  if (typeof window === "undefined") return "normal";
  const search = window.location.search;
  if (search.includes("nobreaks") || search.includes("breaks=off")) return "off";
  if (search.includes("breaks=demo")) return "demo";
  if (search.includes("breaks=fast")) return "fast";
  return "normal";
}

export function firstBreakDelay(hash: number, mode: BreakMode): number {
  if (mode === "demo") return 500 + (hash % 1500);
  if (mode === "fast") return 2500 + (hash % 6000);
  return 8000 + (hash % 40000);
}

export function nextBreakDelay(hash: number, mode: BreakMode): number {
  if (mode === "demo") return 2500 + (hash % 2000);
  if (mode === "fast") return 6000 + (hash % 9000);
  return 45000 + (hash % 65000);
}

export function breakDuration(hash: number, mode: BreakMode): number {
  if (mode === "demo") return 3500;
  if (mode === "fast") return 5000 + (hash % 4000);
  return 8000 + (hash % 6000);
}

export function maxBreakers(idleSeated: number, mode: BreakMode): number {
  if (mode === "demo") return 12;
  if (mode === "fast") return Math.max(2, Math.ceil(idleSeated / 3));
  return Math.max(2, Math.ceil(idleSeated / 5));
}

export function advance(motion: Motion, dt: number, speed: number): boolean {
  let remaining = speed * dt;
  while (remaining > 0 && motion.path.length > 0) {
    const target = motion.path[0];
    const dx = target.x - motion.x;
    const dy = target.y - motion.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= remaining) {
      motion.x = target.x;
      motion.y = target.y;
      motion.path.shift();
      remaining -= distance;
      continue;
    }
    motion.x += (dx / distance) * remaining;
    motion.y += (dy / distance) * remaining;
    remaining = 0;
  }
  return motion.path.length > 0;
}

export function ensureMotion(map: Map<string, Motion>, id: string, x: number, y: number): Motion {
  const existing = map.get(id);
  if (existing) return existing;
  const motion: Motion = { x, y, path: [] };
  map.set(id, motion);
  return motion;
}

export function setDestination(motion: Motion, path: Point[]) {
  motion.path = path;
}

export function seatExit(seat: Seat): Point {
  const cubicle = seat.workstation.cubicle;
  return { x: cubicle.x + cubicle.w / 2, y: cubicle.y + cubicle.h + 4 };
}
