import type { SeatRole } from "../scene/occupancy";

export type LayoutItemType =
  | "desk"
  | "chair"
  | "monitor"
  | "rug"
  | "cabinet"
  | "plant"
  | "lamp"
  | "trash"
  | "window"
  | "door"
  | "art"
  | "sign";

export type LayoutItem = {
  id: string;
  type: LayoutItemType;
  x: number;
  y: number;
  rotation?: 0 | 1 | 2 | 3;
  width?: number;
  depth?: number;
  height?: number;
  variant?: string;
};

export type LayoutSeat = {
  id: string;
  x: number;
  y: number;
  z?: number;
  role?: SeatRole;
  chairId?: string;
};

export type LayoutV2 = {
  version: 2;
  tile: { w: number; h: number };
  wallHeight: number;
  room: {
    id: string;
    name: string;
    width: number;
    height: number;
    floor: "light" | "warm" | "cool";
    wall: "cream" | "blue" | "green";
  };
  items: LayoutItem[];
  seats: LayoutSeat[];
};

export const FURNITURE_SIZES: Record<LayoutItemType, { width: number; depth: number; height: number }> = {
  desk: { width: 2.4, depth: 1.2, height: 22 },
  chair: { width: 0.9, depth: 0.9, height: 46 },
  monitor: { width: 0.7, depth: 0.3, height: 34 },
  rug: { width: 5, depth: 3, height: 0 },
  cabinet: { width: 1.6, depth: 1.1, height: 48 },
  plant: { width: 0.8, depth: 0.8, height: 44 },
  lamp: { width: 0.5, depth: 0.5, height: 42 },
  trash: { width: 0.45, depth: 0.45, height: 20 },
  window: { width: 3, depth: 0.1, height: 50 },
  door: { width: 1.4, depth: 0.1, height: 72 },
  art: { width: 1.4, depth: 0.1, height: 18 },
  sign: { width: 4.5, depth: 0.1, height: 18 }
};
