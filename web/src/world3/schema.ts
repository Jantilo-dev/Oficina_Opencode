export type OfficeItemType =
  | "desk"
  | "chair"
  | "monitor"
  | "pc"
  | "lamp"
  | "plant"
  | "cabinet"
  | "printer"
  | "sofa"
  | "table"
  | "meetingChair"
  | "water"
  | "coffee"
  | "trash"
  | "recycle"
  | "whiteboard"
  | "cork"
  | "art"
  | "window"
  | "partition"
  | "rug"
  | "books"
  | "box"
  | "cup"
  | "paper"
  | "light"
  | "wall1"
  | "wall2"
  | "catMale"
  | "catFemale";

export type OfficeItem = {
  id: string;
  type: OfficeItemType;
  x: number;
  y: number;
  w?: number;
  d?: number;
  height?: number;
  rotation?: 0 | 1 | 2 | 3;
  variant?: string;
};

export type OfficeLayout = {
  version: 3;
  tile: { w: number; h: number };
  wallHeight: number;
  room: {
    id: string;
    name: string;
    width: number;
    height: number;
    floor: "blue" | "gray" | "warm";
    wall: "cream" | "white" | "blue";
  };
  items: OfficeItem[];
};

export type AssetDefinition = {
  type: OfficeItemType;
  label: string;
  width: number;
  depth: number;
  height: number;
  layer: "floor" | "wall" | "back" | "middle" | "front" | "ceiling";
  collision?: boolean;
};
