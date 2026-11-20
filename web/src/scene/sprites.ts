import { DEFAULT_PARTS, type CharacterLook, type CharacterParts } from "../characters";
import { drawPerson, drawDeskArms, drawSeatedLegs } from "../characterSprite";
import type { ThemeName } from "../office/sprites";

export type SceneStatus = "idle" | "thinking" | "coding" | "running_tool" | "talking" | "error";

export type SceneAgent = {
  id: string;
  name: string;
  status: SceneStatus;
  task?: string;
  file?: string;
  logs: string[];
  look?: CharacterLook;
  spawnedAt?: number;
  isManager?: boolean;
  gender?: "male" | "female";
};

export type AgentColors = { shirt: string; shirtDark: string; hair: string; skin: string; pants: string };

export type AgentView = SceneAgent & {
  x: number;
  y: number;
  walking: boolean;
  seated: boolean;
  colors: AgentColors;
};

export type Cubicle = { x: number; y: number; w: number; h: number; seatX: number; seatY: number };

export type Workstation = { kind: "cubicle"; cubicle: Cubicle; seatX: number; seatY: number };

export const AREAS = [
  { id: "intranet", label: "AREA INTRANET", x: 30, y: 160, w: 520, h: 420 },
  { id: "logistica", label: "AREA LOGÍSTICA", x: 30, y: 580, w: 520, h: 420 },
  { id: "cocina", label: "COCINA", x: 30, y: 1020, w: 520, h: 310 },
  { id: "soporte", label: "AREA SOPORTE", x: 590, y: 160, w: 520, h: 420 },
  { id: "portal", label: "AREA PORTAL", x: 590, y: 580, w: 520, h: 420 },
  { id: "reuniones", label: "SALA DE REUNIONES", x: 590, y: 1020, w: 520, h: 310 },
  { id: "pasillo", label: "PASILLO", x: 1150, y: 625, w: 420, h: 705 },
  { id: "gerencia", label: "GERENCIA", x: 30, y: 1420, w: 520, h: 230 },
  { id: "oficina2", label: "OFICINA 2", x: 590, y: 1420, w: 520, h: 230 },
  { id: "oficina3", label: "OFICINA 3", x: 1150, y: 1420, w: 420, h: 230 },
  { id: "oficina4", label: "OFICINA 4", x: 30, y: 1720, w: 520, h: 230 },
  { id: "oficina5", label: "OFICINA 5", x: 590, y: 1720, w: 520, h: 230 },
  { id: "oficina6", label: "OFICINA 6", x: 1150, y: 1720, w: 420, h: 230 }
] as const;

const GROUP_AREA_IDS = new Set(["intranet", "logistica", "soporte", "portal"]);

export const CUBICLES: Cubicle[] = [
  { x: 50, y: 210, w: 160, h: 168, seatX: 108, seatY: 334 },
  { x: 216, y: 210, w: 160, h: 168, seatX: 274, seatY: 334 },
  { x: 382, y: 210, w: 160, h: 168, seatX: 440, seatY: 334 },
  { x: 70, y: 400, w: 160, h: 168, seatX: 128, seatY: 524 },
  { x: 310, y: 400, w: 160, h: 168, seatX: 368, seatY: 524 },
  { x: 50, y: 630, w: 160, h: 168, seatX: 108, seatY: 754 },
  { x: 216, y: 630, w: 160, h: 168, seatX: 274, seatY: 754 },
  { x: 382, y: 630, w: 160, h: 168, seatX: 440, seatY: 754 },
  { x: 70, y: 820, w: 160, h: 168, seatX: 128, seatY: 944 },
  { x: 310, y: 820, w: 160, h: 168, seatX: 368, seatY: 944 },
  { x: 610, y: 210, w: 160, h: 168, seatX: 668, seatY: 334 },
  { x: 776, y: 210, w: 160, h: 168, seatX: 834, seatY: 334 },
  { x: 942, y: 210, w: 160, h: 168, seatX: 1000, seatY: 334 },
  { x: 630, y: 400, w: 160, h: 168, seatX: 688, seatY: 524 },
  { x: 870, y: 400, w: 160, h: 168, seatX: 928, seatY: 524 },
  { x: 610, y: 630, w: 160, h: 168, seatX: 668, seatY: 754 },
  { x: 776, y: 630, w: 160, h: 168, seatX: 834, seatY: 754 },
  { x: 942, y: 630, w: 160, h: 168, seatX: 1000, seatY: 754 },
  { x: 630, y: 820, w: 160, h: 168, seatX: 688, seatY: 944 },
  { x: 870, y: 820, w: 160, h: 168, seatX: 928, seatY: 944 }
];

export const CUBICLES2: Cubicle[] = [
  { x: 110, y: 1465, w: 160, h: 168, seatX: 168, seatY: 1589 },
  { x: 280, y: 1465, w: 160, h: 168, seatX: 338, seatY: 1589 },
  { x: 670, y: 1465, w: 160, h: 168, seatX: 728, seatY: 1589 },
  { x: 840, y: 1465, w: 160, h: 168, seatX: 898, seatY: 1589 },
  { x: 1190, y: 1465, w: 160, h: 168, seatX: 1248, seatY: 1589 },
  { x: 1360, y: 1465, w: 160, h: 168, seatX: 1418, seatY: 1589 },
  { x: 110, y: 1765, w: 160, h: 168, seatX: 168, seatY: 1889 },
  { x: 280, y: 1765, w: 160, h: 168, seatX: 338, seatY: 1889 },
  { x: 670, y: 1765, w: 160, h: 168, seatX: 728, seatY: 1889 },
  { x: 840, y: 1765, w: 160, h: 168, seatX: 898, seatY: 1889 },
  { x: 1190, y: 1765, w: 160, h: 168, seatX: 1248, seatY: 1889 },
  { x: 1360, y: 1765, w: 160, h: 168, seatX: 1418, seatY: 1889 }
];

export const MANAGER_SEAT = CUBICLES.length;

export const ENTRANCE = { x: 1548, y: 820 };

export const RECEPTION_DESK = { x: 1420, y: 825, w: 120, h: 50, seatX: 1480, seatY: 812 };

const SEAT_X_OFFSET = 12;
const SEAT_Y_OFFSET = 8;

export const WORKSTATIONS: Workstation[] = [
  ...CUBICLES.map((cubicle) => ({
    kind: "cubicle" as const,
    cubicle,
    seatX: cubicle.seatX + SEAT_X_OFFSET,
    seatY: cubicle.seatY + SEAT_Y_OFFSET
  })),
  ...CUBICLES2.map((cubicle) => ({
    kind: "cubicle" as const,
    cubicle,
    seatX: cubicle.seatX + SEAT_X_OFFSET,
    seatY: cubicle.seatY + SEAT_Y_OFFSET
  }))
];

export const CAFE_SPOTS = [
  { x: 130, y: 1280 },
  { x: 210, y: 1280 },
  { x: 290, y: 1280 },
  { x: 160, y: 1255 }
];

export const HALL_SPOTS = [
  { x: 500, y: 920 },
  { x: 570, y: 920 },
  { x: 640, y: 920 },
  { x: 710, y: 920 },
  { x: 1210, y: 880 },
  { x: 1290, y: 880 }
];

const SKINS = ["#f2c6a0", "#e8b98f", "#d79a6a", "#b97a4e", "#8d5a38"];

export function agentColors(id: string): AgentColors {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return {
    shirt: `hsl(${hue} 52% 55%)`,
    shirtDark: `hsl(${hue} 52% 40%)`,
    hair: ["#2b2118", "#4a2f1d", "#1b1b24", "#6b4a1e", "#3a2a3a"][hash % 5],
    skin: SKINS[(hash >>> 3) % SKINS.length],
    pants: ["#2f3a4d", "#3c3f4a", "#4a3b2f", "#2b3b34"][hash % 4]
  };
}

const LOOK_PRESETS: Record<string, Partial<CharacterParts>> = {
  ninja: { hair: "short", accessory: "headband", shirt: "#2f3550", hairColor: "#1f2333", skin: "#e8b98f" },
  idol: { hair: "twin", accessory: "star", shirt: "#d05aa0", hairColor: "#5b3520", skin: "#f0c090" },
  scientist: { hair: "short", accessory: "glasses", shirt: "#f4f6f8", hairColor: "#6b4a1e", skin: "#e8b98f" },
  hero: { hair: "spiky", accessory: "cape", shirt: "#b3342f", hairColor: "#3a2a1a", skin: "#f0c090" },
  samurai: { hair: "short", accessory: "headband", shirt: "#4a2f2f", hairColor: "#1b1b24", skin: "#d79a6a" },
  mage: { hair: "long", accessory: "star", shirt: "#5a3a80", hairColor: "#6b4a1e", skin: "#e8b98f" },
  mecha: { hair: "short", accessory: "glasses", shirt: "#3b4757", hairColor: "#1b1b24", skin: "#d79a6a" },
  goth: { hair: "long", accessory: "none", shirt: "#2a2430", hairColor: "#1b1b24", skin: "#f0c090" }
};

function partsFor(look: CharacterLook | undefined): CharacterParts | undefined {
  if (look?.parts) return look.parts;
  if (look?.avatar && LOOK_PRESETS[look.avatar]) {
    return { ...DEFAULT_PARTS, ...LOOK_PRESETS[look.avatar] };
  }
  return undefined;
}

function genderOf(id: string, look: CharacterLook | undefined): "male" | "female" {
  if (look?.parts?.gender) return look.parts.gender;
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % 2 === 0 ? "female" : "male";
}

function shadeColor(color: string, factor: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color;
  const value = Number.parseInt(color.slice(1), 16);
  const r = Math.max(0, Math.min(255, Math.round(((value >> 16) & 255) * factor)));
  const g = Math.max(0, Math.min(255, Math.round(((value >> 8) & 255) * factor)));
  const b = Math.max(0, Math.min(255, Math.round((value & 255) * factor)));
  return `rgb(${r} ${g} ${b})`;
}

const avatarImages = new Map<string, HTMLImageElement>();

function isDrawableAvatar(src: string | undefined): src is string {
  return Boolean(src) && (src!.startsWith("data:image/") || src!.startsWith("blob:") || src!.startsWith("/"));
}

function avatarImage(src: string): HTMLImageElement | null {
  if (typeof window === "undefined") return null;
  let image = avatarImages.get(src);
  if (!image) {
    image = new Image();
    image.src = src;
    avatarImages.set(src, image);
  }
  return image.complete && image.naturalWidth > 0 ? image : null;
}

function drawAvatar(ctx: Ctx, src: string, x: number, y: number, width: number, height: number): boolean {
  const image = avatarImage(src);
  if (!image) return false;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, Math.round(x), Math.round(y), width, height);
  return true;
}

type Ctx = CanvasRenderingContext2D;

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

const INK = "#1a2430";
let WALL = "#c9cfd8";
let WALL_DARK = "#a8b0bb";
let WALL_LINE = "#b7bec8";
let BASE = "#6f7884";
let FLOOR = "#4a86d8";
let FLOOR_HI = "#5b97e6";
let FLOOR_LO = "#2f5f9f";
const WOOD = "#d9a86c";
const WOOD_DARK = "#b9854f";
const WOOD_EDGE = "#8a5a3b";
let PANEL = "#b9c0c9";
let PANEL_DARK = "#6b7480";
let PANEL_TRIM = "#7fb2e8";
let CORRIDOR = "#e6e9ee";
let CORRIDOR_LINE = "#cfd5dd";
let CORRIDOR_EDGE = "#c3cad4";

type ScenePalette = {
  wall: string;
  wallDark: string;
  wallLine: string;
  base: string;
  floor: string;
  floorHi: string;
  floorLo: string;
  panel: string;
  panelDark: string;
  panelTrim: string;
  corridor: string;
  corridorLine: string;
  corridorEdge: string;
};

const SCENE_PALETTES: Record<ThemeName, ScenePalette> = {
  fuego: {
    wall: "#c9cfd8",
    wallDark: "#a8b0bb",
    wallLine: "#b7bec8",
    base: "#6f7884",
    floor: "#4a86d8",
    floorHi: "#5b97e6",
    floorLo: "#2f5f9f",
    panel: "#b9c0c9",
    panelDark: "#6b7480",
    panelTrim: "#7fb2e8",
    corridor: "#e6e9ee",
    corridorLine: "#cfd5dd",
    corridorEdge: "#c3cad4"
  },
  rubi: {
    wall: "#d9c2be",
    wallDark: "#b79a95",
    wallLine: "#c9aeaa",
    base: "#806a68",
    floor: "#a84a4a",
    floorHi: "#c25a5a",
    floorLo: "#7d3030",
    panel: "#c9b6b2",
    panelDark: "#806a68",
    panelTrim: "#e08a7a",
    corridor: "#f1e4e0",
    corridorLine: "#d9c2be",
    corridorEdge: "#c9aeaa"
  },
  esmeralda: {
    wall: "#c2d4c8",
    wallDark: "#9db3a2",
    wallLine: "#b0c6b5",
    base: "#667a6c",
    floor: "#3f8f6a",
    floorHi: "#50a87e",
    floorLo: "#2b6b4c",
    panel: "#b6c9bc",
    panelDark: "#667a6c",
    panelTrim: "#7fd0a0",
    corridor: "#e6efe9",
    corridorLine: "#cfded3",
    corridorEdge: "#c0d2c6"
  }
};

export function sceneBackground(theme: ThemeName): string {
  const palette = SCENE_PALETTES[theme] ?? SCENE_PALETTES.fuego;
  return palette.floor;
}

function applyTheme(theme: ThemeName) {
  const palette = SCENE_PALETTES[theme] ?? SCENE_PALETTES.fuego;
  WALL = palette.wall;
  WALL_DARK = palette.wallDark;
  WALL_LINE = palette.wallLine;
  BASE = palette.base;
  FLOOR = palette.floor;
  FLOOR_HI = palette.floorHi;
  FLOOR_LO = palette.floorLo;
  PANEL = palette.panel;
  PANEL_DARK = palette.panelDark;
  PANEL_TRIM = palette.panelTrim;
  CORRIDOR = palette.corridor;
  CORRIDOR_LINE = palette.corridorLine;
  CORRIDOR_EDGE = palette.corridorEdge;
}

function drawFloor(ctx: Ctx, width: number, height: number) {
  rect(ctx, 0, 0, width, height, FLOOR);
  const tw = 64;
  const th = 32;
  for (let row = 0; row * th < height; row++) {
    const offset = row % 2 === 0 ? 0 : tw / 2;
    for (let x = -offset; x < width; x += tw) {
      rect(ctx, x, row * th, tw, th, FLOOR);
      rect(ctx, x, row * th, tw, 2, FLOOR_LO);
      rect(ctx, x, row * th, 2, th, FLOOR_LO);
      rect(ctx, x + 3, row * th + 3, tw - 6, 2, FLOOR_HI);
    }
  }
}

function drawTopWall(ctx: Ctx, width: number) {
  rect(ctx, 0, 0, width, 140, WALL);
  for (let x = 24; x < width - 24; x += 120) {
    rect(ctx, x, 8, 2, 116, WALL_LINE);
  }
  rect(ctx, 0, 0, width, 6, WALL_DARK);
  rect(ctx, 0, 134, width, 6, BASE);
  rect(ctx, 0, 130, width, 3, "#8f98a3");

  for (let i = 0; i < 3; i++) {
    const x = 196 + i * 252;
    const y = 18;
    const w = 176;
    const h = 92;
    rect(ctx, x - 6, y - 6, w + 12, h + 12, "#e9ecf0");
    rect(ctx, x, y, w, h, "#3d78b4");
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, "#2f6fb0");
    g.addColorStop(1, "#8fd0f0");
    ctx.fillStyle = g;
    ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
    for (let s = -h; s < w; s += 26) {
      ctx.strokeStyle = "#ffffff3a";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x + s, y + 3);
      ctx.lineTo(x + s + h, y + h - 3);
      ctx.stroke();
    }
    rect(ctx, x + w / 2 - 2, y, 4, h, "#e9ecf0");
    rect(ctx, x, y + h / 2 - 2, w, 4, "#e9ecf0");
  }

  const calX = 84;
  const calY = 36;
  rect(ctx, calX - 3, calY - 3, 72, 56, "#9aa2ad");
  rect(ctx, calX, calY, 66, 50, "#f4f6f8");
  rect(ctx, calX, calY, 66, 12, "#c0392b");
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      rect(ctx, calX + 6 + c * 12, calY + 20 + r * 9, 7, 6, "#d3d8de");
    }
  }

  const doorX = width - 226;
  rect(ctx, doorX - 6, 12, 218, 122, "#9aa2ad");
  rect(ctx, doorX, 18, 102, 112, "#1e3f66");
  rect(ctx, doorX + 110, 18, 102, 112, "#1e3f66");
  rect(ctx, doorX + 6, 26, 90, 98, "#2f5f95");
  rect(ctx, doorX + 116, 26, 90, 98, "#2f5f95");
  for (let i = 0; i < 4; i++) {
    rect(ctx, doorX + 14 + i * 22, 34, 4, 82, "#4f86c0");
    rect(ctx, doorX + 124 + i * 22, 34, 4, 82, "#4f86c0");
  }
  rect(ctx, doorX + 92, 66, 5, 22, "#d8dce2");
  rect(ctx, doorX + 115, 66, 5, 22, "#d8dce2");
}

function drawPlant(ctx: Ctx, x: number, y: number) {
  rect(ctx, x + 4, y + 30, 28, 22, "#b0623a");
  rect(ctx, x + 7, y + 33, 22, 17, "#d07a4a");
  rect(ctx, x + 14, y + 8, 8, 26, "#3f8f57");
  rect(ctx, x + 4, y + 14, 12, 12, "#4fa267");
  rect(ctx, x + 20, y + 10, 11, 14, "#357a49");
  rect(ctx, x + 10, y, 12, 10, "#5cb878");
}

function drawWall(ctx: Ctx, x: number, y: number, w: number, h: number) {
  rect(ctx, x, y, w, h, "#8f98a3");
  rect(ctx, x + 2, y + 2, w - 4, h - 4, "#eef1f5");
  if (w >= h) rect(ctx, x + 2, y + 2, w - 4, 2, "#ffffffcc");
  else rect(ctx, x + 2, y + 2, 2, h - 4, "#ffffffcc");
}

function vWall(ctx: Ctx, x: number, y1: number, y2: number, gaps: Array<[number, number]>) {
  let cursor = y1;
  for (const [from, to] of gaps) {
    if (from > cursor) drawWall(ctx, x, cursor, 10, from - cursor);
    cursor = to;
  }
  if (cursor < y2) drawWall(ctx, x, cursor, 10, y2 - cursor);
}

function hWall(ctx: Ctx, y: number, x1: number, x2: number, gaps: Array<[number, number]>) {
  let cursor = x1;
  for (const [from, to] of gaps) {
    if (from > cursor) drawWall(ctx, cursor, y, from - cursor, 10);
    cursor = to;
  }
  if (cursor < x2) drawWall(ctx, cursor, y, x2 - cursor, 10);
}

function drawCorridor(ctx: Ctx, x1: number, x2: number, y1: number, y2: number) {
  rect(ctx, x1, y1, x2 - x1, y2 - y1, CORRIDOR);
  for (let y = y1; y < y2; y += 32) {
    rect(ctx, x1, y, x2 - x1, 1, CORRIDOR_LINE);
  }
  rect(ctx, x1, y1, 2, y2 - y1, CORRIDOR_EDGE);
  rect(ctx, x2 - 2, y1, 2, y2 - y1, CORRIDOR_EDGE);
}

function drawCorridors(ctx: Ctx) {
  for (const [x1, x2] of [
    [550, 590],
    [1110, 1150]
  ]) {
    drawCorridor(ctx, x1, x2, 150, 1330);
  }
  drawCorridor(ctx, 30, 1560, 1360, 1410);
  drawCorridor(ctx, 550, 590, 1360, 2000);
  drawCorridor(ctx, 1110, 1150, 1360, 2000);
  drawCorridor(ctx, 30, 1560, 1650, 1710);
  drawCorridor(ctx, 30, 1560, 1950, 2000);
}

function drawRooms(ctx: Ctx) {
  drawWall(ctx, 18, 150, 12, 1850);
  drawWall(ctx, 1570, 150, 12, 1850);
  hWall(ctx, 1330, 18, 1582, [
    [550, 590],
    [1110, 1150],
    [1230, 1270]
  ]);
  drawWall(ctx, 30, 1342, 520, 18);
  drawWall(ctx, 590, 1342, 520, 18);
  drawWall(ctx, 1150, 1342, 80, 18);
  drawWall(ctx, 1270, 1342, 300, 18);
  drawWall(ctx, 18, 2000, 1552, 12);

  hWall(ctx, 1420, 30, 550, []);
  hWall(ctx, 1420, 590, 1110, []);
  hWall(ctx, 1420, 1150, 1570, []);
  hWall(ctx, 1650, 30, 550, [[250, 330]]);
  hWall(ctx, 1650, 590, 1110, [[810, 890]]);
  hWall(ctx, 1650, 1150, 1570, [[1320, 1400]]);
  hWall(ctx, 1720, 30, 550, []);
  hWall(ctx, 1720, 590, 1110, []);
  hWall(ctx, 1720, 1150, 1570, []);
  hWall(ctx, 1950, 30, 550, [[250, 330]]);
  hWall(ctx, 1950, 590, 1110, [[810, 890]]);
  hWall(ctx, 1950, 1150, 1570, [[1320, 1400]]);

  vWall(ctx, 30, 1420, 1650, []);
  vWall(ctx, 550, 1420, 1650, []);
  vWall(ctx, 590, 1420, 1650, []);
  vWall(ctx, 1110, 1420, 1650, []);
  vWall(ctx, 1150, 1420, 1650, []);
  vWall(ctx, 30, 1720, 1950, []);
  vWall(ctx, 550, 1720, 1950, []);
  vWall(ctx, 590, 1720, 1950, []);
  vWall(ctx, 1110, 1720, 1950, []);
  vWall(ctx, 1150, 1720, 1950, []);

  const gaps: Array<[number, number]> = [
    [480, 520],
    [890, 930],
    [1200, 1240]
  ];
  vWall(ctx, 550, 150, 1330, gaps);
  vWall(ctx, 590, 150, 1330, []);
  vWall(ctx, 1110, 150, 1330, gaps);
  vWall(ctx, 1150, 150, 1330, [[900, 940]]);

  hWall(ctx, 580, 30, 550, []);
  hWall(ctx, 580, 590, 1110, []);
  hWall(ctx, 1000, 30, 550, []);
  hWall(ctx, 1000, 590, 1110, []);
  hWall(ctx, 615, 1150, 1570, [
    [1240, 1272],
    [1400, 1432]
  ]);

  const doorMarker = (x: number, from: number, to: number) => {
    rect(ctx, x, to - 26, 6, 22, "#a07a52");
    rect(ctx, x, from + 2, 6, 3, "#c9a071");
  };
  for (const [from, to] of gaps) {
    doorMarker(552, from, to);
    doorMarker(1112, from, to);
  }
  doorMarker(1152, 900, 940);
  for (const [x, w] of [
    [550, 40],
    [1110, 40],
    [1230, 40]
  ] as const) {
    rect(ctx, x + 2, 1332, w - 4, 26, "#d7dde6");
    for (let i = 0; i < 4; i++) rect(ctx, x + 4, 1334 + i * 6, w - 6, 2, "#9aa3ae");
  }
  rect(ctx, 1246, 617, 24, 6, "#a07a52");

  for (const [cx, door] of [
    [290, 1650],
    [850, 1650],
    [1360, 1650],
    [290, 1950],
    [850, 1950],
    [1360, 1950]
  ]) {
    rect(ctx, cx - 20, door, 40, 10, "#eef1f5");
    rect(ctx, cx - 16, door + 2, 32, 6, "#9aa3ae");
  }
}

function drawAisle(ctx: Ctx, x: number, y: number, w: number, h: number) {
  if (w <= 0 || h <= 0) return;
  rect(ctx, x, y, w, h, CORRIDOR);
  for (let yy = y + 12; yy < y + h; yy += 24) {
    rect(ctx, x + 2, yy, w - 4, 1, CORRIDOR_LINE);
  }
  rect(ctx, x, y, 2, h, CORRIDOR_EDGE);
  rect(ctx, x + w - 2, y, 2, h, CORRIDOR_EDGE);
}

function drawUpperAisles(ctx: Ctx) {
  for (const area of AREAS) {
    if (!["intranet", "logistica", "soporte", "portal"].includes(area.id)) continue;
    const { x, y, w, h } = area;
    drawAisle(ctx, x + 20, y + 218, w - 40, 22);
    drawAisle(ctx, x, y + 240, 40, h - 240);
    drawAisle(ctx, x + 200, y + 240, 80, h - 240);
    drawAisle(ctx, x + w - 80, y + 240, 80, h - 240);
    drawAisle(ctx, x, y + h - 12, w, 12);
  }
}

function drawAreaLabel(ctx: Ctx, x: number, y: number, text: string) {
  ctx.font = "bold 10px ui-monospace, Consolas, monospace";
  const width = ctx.measureText(text).width + 22;
  rect(ctx, x - width / 2 - 2, y - 13, width + 4, 21, "#252c36");
  rect(ctx, x - width / 2, y - 11, width, 17, "#33405a");
  rect(ctx, x - width / 2 + 4, y - 7, 4, 4, "#e0a92e");
  ctx.fillStyle = "#f4f6f8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 2, y - 2);
}

function drawCafe(ctx: Ctx) {
  rect(ctx, 40, 672, 340, 268, "#eef1f5");
  rect(ctx, 52, 690, 316, 22, WOOD_DARK);
  rect(ctx, 54, 692, 312, 16, WOOD);

  rect(ctx, 72, 658, 46, 34, "#3a4048");
  rect(ctx, 76, 662, 38, 12, "#586270");
  rect(ctx, 78, 680, 12, 8, "#f4f6f8");
  rect(ctx, 96, 680, 8, 8, "#e05a4a");

  rect(ctx, 150, 700, 34, 64, "#e8eaee");
  rect(ctx, 154, 704, 26, 56, "#f4f6f8");
  rect(ctx, 160, 674, 14, 30, "#7fc7e8");

  rect(ctx, 306, 676, 54, 88, "#2b3440");
  rect(ctx, 310, 680, 46, 10, "#3b4757");
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      rect(ctx, 312 + c * 10, 696 + r * 16, 8, 10, ["#e05a4a", "#f0c24a", "#5aa064", "#5a8fd0"][(r + c) % 4]);
    }
  }

  rect(ctx, 110, 806, 180, 40, WOOD_DARK);
  rect(ctx, 113, 809, 174, 32, WOOD);
  rect(ctx, 113, 809, 174, 4, "#ecc48c");
  rect(ctx, 128, 792, 20, 14, "#3b4657");
  rect(ctx, 160, 792, 20, 14, "#3b4657");
  rect(ctx, 192, 792, 20, 14, "#3b4657");
  rect(ctx, 128, 848, 20, 14, "#3b4657");
  rect(ctx, 160, 848, 20, 14, "#3b4657");
  rect(ctx, 192, 848, 20, 14, "#3b4657");
  rect(ctx, 156, 812, 10, 8, "#f4f6f8");
  rect(ctx, 180, 812, 8, 8, "#e05a4a");

  drawPlant(ctx, 48, 860);
  drawPlant(ctx, 330, 860);
}

function drawMeeting(ctx: Ctx) {
  rect(ctx, 590, 668, 520, 274, "#e9edf2");
  rect(ctx, 610, 680, 150, 44, "#f4f6f8");
  rect(ctx, 614, 684, 142, 36, "#dfe8f0");
  rect(ctx, 622, 694, 60, 3, "#5a8fd0");
  rect(ctx, 622, 702, 90, 3, "#8fa8c0");

  rect(ctx, 626, 770, 250, 84, WOOD_DARK);
  rect(ctx, 630, 774, 242, 76, WOOD);
  rect(ctx, 630, 774, 242, 4, "#ecc48c");
  for (let i = 0; i < 3; i++) {
    rect(ctx, 646 + i * 70, 748, 26, 16, "#3b4657");
    rect(ctx, 646 + i * 70, 860, 26, 16, "#3b4657");
  }
  rect(ctx, 602, 800, 16, 26, "#3b4657");
  rect(ctx, 884, 800, 16, 26, "#3b4657");
  drawPlant(ctx, 870, 680);
}

function drawBathroom(ctx: Ctx) {
  rect(ctx, 1150, 168, 420, 439, "#e3e7ec");
  for (let y = 168; y < 607; y += 24) {
    rect(ctx, 1150, y, 420, 1, "#cfd5dd");
  }
  for (let x = 1150; x < 1570; x += 24) {
    rect(ctx, x, 168, 1, 439, "#cfd5dd");
  }

  for (const [side, start] of [
    ["left", 1160],
    ["right", 1352]
  ] as const) {
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 3; i++) {
        const sx = start + i * 60;
        const sy = row === 0 ? 200 : 440;
        rect(ctx, sx, sy, 56, 84, "#dfe4ea");
        rect(ctx, sx, sy, 56, 3, "#f4f6f8");
        rect(ctx, sx, sy, 3, 84, "#b7bec8");
        rect(ctx, sx + 53, sy, 3, 84, "#b7bec8");
        rect(ctx, sx + 18, sy + 52, 20, 4, "#c9cfd8");
        rect(ctx, sx + 20, sy + 56, 16, 22, "#f4f6f8");
        rect(ctx, sx + 20, sy + 78, 16, 3, "#c9cfd8");
      }
    }
    const sinkX = side === "left" ? 1178 : 1370;
    rect(ctx, sinkX, 350, 120, 12, "#c9cfd8");
    for (let i = 0; i < 3; i++) {
      rect(ctx, sinkX + 8 + i * 35, 344, 20, 14, "#f4f6f8");
      rect(ctx, sinkX + 8 + i * 35, 330, 20, 10, "#a8d6e8");
    }
  }

  drawWall(ctx, 1340, 168, 10, 457);
  drawAreaLabel(ctx, 1245, 190, "HOMBRES");
  drawAreaLabel(ctx, 1435, 190, "MUJERES");
  drawPlant(ctx, 1152, 540);
  drawPlant(ctx, 1540, 540);
}

function drawPasillo(ctx: Ctx) {
  rect(ctx, 1150, 633, 420, 697, "#e6e9ee");
  for (let y = 633; y < 1330; y += 32) {
    rect(ctx, 1150, y, 420, 1, "#cfd5dd");
  }
  rect(ctx, 1160, 700, 130, 44, "#2f5f95");
  rect(ctx, 1164, 704, 122, 16, "#3f6fad");
  rect(ctx, 1164, 722, 122, 18, "#4f7fbd");
  rect(ctx, 1300, 760, 70, 26, WOOD_DARK);
  rect(ctx, 1303, 763, 64, 20, WOOD);
  drawPlant(ctx, 1460, 680);
  drawPlant(ctx, 1150, 860);
}

function drawReception(ctx: Ctx) {
  const { x, y, w, h } = RECEPTION_DESK;
  rect(ctx, x + 6, y + h - 2, w - 12, 8, "#1f3f7533");
  rect(ctx, x, y, w, 12, WOOD);
  rect(ctx, x, y, w, 2, "#ecc48c");
  rect(ctx, x, y + 12, w, 10, WOOD_DARK);
  rect(ctx, x + 8, y + 22, 7, 24, WOOD_EDGE);
  rect(ctx, x + w - 15, y + 22, 7, 24, WOOD_EDGE);
  rect(ctx, x + w - 38, y - 16, 24, 18, "#222932");
  rect(ctx, x + w - 35, y - 13, 18, 10, "#3b4757");
  rect(ctx, x + w - 30, y - 9, 8, 2, "#83c8dc");
  rect(ctx, x + 18, y + 4, 34, 8, "#3a414d");
  rect(ctx, x + 20, y + 6, 30, 2, "#8a94a2");
  rect(ctx, x + 62, y + 4, 16, 8, "#c9cfd8");
  rect(ctx, x + 65, y + 6, 10, 2, "#6b7480");
  rect(ctx, x + 18, y - 12, 28, 8, "#f4f6f8");
  rect(ctx, x + 20, y - 10, 24, 2, "#8a5a3b");
}

function drawEntrance(ctx: Ctx) {
  const y = 794;
  rect(ctx, 1566, y - 6, 16, 66, "#9aa2ad");
  rect(ctx, 1570, y, 10, 26, "#2f5f95");
  rect(ctx, 1570, y + 30, 10, 26, "#2f5f95");
  rect(ctx, 1572, y + 4, 6, 18, "#4f86c0");
  rect(ctx, 1572, y + 34, 6, 18, "#4f86c0");
  rect(ctx, 1578, y + 24, 3, 8, "#d8dce2");
  rect(ctx, 1536, y + 58, 34, 5, "#2f5f95");
  rect(ctx, 1540, y + 63, 30, 3, "#4f7fbd");
}

function drawCubicle(ctx: Ctx, cubicle: Cubicle, index: number, screenOn: boolean, active: boolean, t: number) {
  const { x, y, w, h } = cubicle;
  rect(ctx, x + 6, y + h - 2, w - 12, 10, "#1f3f7533");

  rect(ctx, x, y, w, 12, "#d7dde6");
  rect(ctx, x, y, w, 2, "#eef1f5");
  rect(ctx, x, y + 12, w, 8, "#9aa3ae");
  rect(ctx, x, y + 18, w, 2, "#7d8794");
  rect(ctx, x, y + 12, 10, h - 12, "#b3bbc5");
  rect(ctx, x + 10, y + 12, 3, h - 12, "#8f98a3");
  rect(ctx, x + w - 10, y + 12, 10, h - 12, "#b3bbc5");
  rect(ctx, x + w - 13, y + 12, 3, h - 12, "#8f98a3");
  rect(ctx, x + 2, y + 10, w - 4, 2, PANEL_TRIM);

  const notes = ["#f2d24a", "#f08a9a", "#7fd0a0", "#7fb2e8"];
  for (let i = 0; i < 3; i++) {
    rect(ctx, x + 18 + i * 12, y + 14 + (i % 2) * 7, 8, 8, notes[(index + i) % notes.length]);
    rect(ctx, x + 18 + i * 12, y + 22 + (i % 2) * 7, 8, 1, "#00000022");
  }
  rect(ctx, x + w - 42, y + 14, 26, 16, "#f4f6f8");
  rect(ctx, x + w - 42, y + 14, 26, 5, notes[index % notes.length]);
  rect(ctx, x + w - 38, y + 22, 18, 2, "#b0b8c2");
  rect(ctx, x + w - 38, y + 25, 12, 2, "#b0b8c2");

  const deskTop = y + h - 46;
  rect(ctx, x + 12, deskTop, w - 24, 12, WOOD);
  rect(ctx, x + 12, deskTop, w - 24, 2, "#ecc48c");
  rect(ctx, x + 12, deskTop + 12, w - 24, 8, WOOD_DARK);
  rect(ctx, x + 12, deskTop + 20, w - 24, 2, "#7a4a2b");
  rect(ctx, x + 18, deskTop + 22, 8, 24, WOOD_EDGE);
  rect(ctx, x + w - 26, deskTop + 22, 8, 24, WOOD_EDGE);
  rect(ctx, x + 26, deskTop + 22, 2, 24, "#6b452c");
  rect(ctx, x + w - 28, deskTop + 22, 2, 24, "#6b452c");

  const compact = w < 140;
  const laptopX = compact ? x + 8 : x + 22;
  const keyboardX = compact ? x + 38 : x + 52;
  const mouseBase = compact ? x + 82 : x + 96;
  drawLaptop(ctx, laptopX, deskTop, screenOn, active, t);
  if (!compact) drawSideMonitor(ctx, x + w - 54, deskTop, screenOn, t);

  rect(ctx, keyboardX, deskTop + 2, 36, 8, "#232a33");
  rect(ctx, keyboardX + 2, deskTop + 3, 32, 6, "#3a414d");
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 10; col++) {
      rect(ctx, keyboardX + 3 + col * 3, deskTop + 4 + row * 2, 2, 1, "#8a94a2");
    }
  }
  if (active) {
    const key = Math.floor((t / 120 + index * 3) % 10);
    const key2 = (key + 4) % 10;
    rect(ctx, keyboardX + 3 + key * 3, deskTop + 4, 2, 1, "#f2d24a");
    rect(ctx, keyboardX + 3 + key2 * 3, deskTop + 6, 2, 1, "#83c8dc");
  }
  rect(ctx, keyboardX + 2, deskTop + 10, 30, 2, "#1b2028");
  const mouseX = mouseBase + (active ? Math.sin(t / 220 + index) * 2 : 0);
  ctx.fillStyle = "#1b2028";
  ctx.beginPath();
  ctx.ellipse(mouseX, deskTop + 7, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3a414d";
  ctx.beginPath();
  ctx.ellipse(mouseX, deskTop + 6, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  rect(ctx, mouseX + 3, deskTop + 2, 1, 4, "#141920");
  if (screenOn) {
    rect(ctx, mouseX - 1, deskTop + 5, 2, 1, "#8fd0f0");
    rect(ctx, keyboardX, deskTop + 2, 36, 1, "#7fd0e855");
  }
}

function drawLaptop(ctx: Ctx, x: number, deskTop: number, screenOn: boolean, active: boolean, t: number) {
  rect(ctx, x, deskTop + 2, 26, 7, "#343c48");
  rect(ctx, x + 2, deskTop + 3, 22, 2, "#4a5462");
  for (let i = 0; i < 4; i++) {
    rect(ctx, x + 3 + i * 5, deskTop + 6, 3, 1, active && i === Math.floor(t / 200) % 4 ? "#f2d24a" : "#8f97a3");
  }
  rect(ctx, x + 2, deskTop - 14, 22, 14, screenOn ? "#c9d8e0" : "#a8b2bc");
  rect(ctx, x + 2, deskTop - 14, 22, 2, "#e4e8ee");
  rect(ctx, x + 18, deskTop - 12, 2, 10, "#8f98a3");
  rect(ctx, x + 2, deskTop - 12, 3, 10, screenOn ? "#7fd0e8" : "#39424e");
  rect(ctx, x + 19, deskTop - 6, 2, 2, screenOn ? "#63e6a8" : "#5a2a2a");
  if (screenOn) {
    rect(ctx, x + 2, deskTop - 4, 3, 2, "#c9f0fa");
    rect(ctx, x, deskTop + 10, 24, 2, "#7fd0e833");
    ctx.fillStyle = "rgba(127, 208, 232, 0.10)";
    ctx.fillRect(x - 3, deskTop - 16, 28, 20);
  }
}

function drawSideMonitor(ctx: Ctx, x: number, deskTop: number, screenOn: boolean, t: number) {
  const w = 32;
  const h = 26;
  const top = deskTop - h - 5;
  rect(ctx, x + 5, deskTop + 1, 22, 3, "#2b323c");
  rect(ctx, x + 12, deskTop - 3, 8, 4, "#3a414d");
  rect(ctx, x + 2, deskTop + 4, w - 4, 2, "#00000022");

  rect(ctx, x, top, w, h, "#222932");
  rect(ctx, x + 2, top + 2, w - 4, h - 4, screenOn ? "#2f5f88" : "#1b232d");
  if (screenOn) {
    rect(ctx, x + 3, top + 3, w - 6, 2, "#4f9fd0");
    rect(ctx, x + 5, top + 8, w - 13, 2, "#83c8dc");
    rect(ctx, x + 5, top + 12, w - 18, 2, "#5f9fc0");
    rect(ctx, x + 5, top + 16, w - 10, 2, "#3f7fa8");
    if (Math.floor(t / 500) % 2 === 0) rect(ctx, x + 5, top + 20, 4, 2, "#c9f0fa");
  } else {
    ctx.strokeStyle = "#ffffff18";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 5, top + h - 5);
    ctx.lineTo(x + w - 7, top + 5);
    ctx.stroke();
  }
  rect(ctx, x, top + 2, 4, h - 4, screenOn ? "#7fd0e8" : "#39424e");
  if (screenOn) {
    rect(ctx, x, top + 4, 2, h - 8, "#c9f0fa");
    const pulse = 0.5 + Math.sin(t / 500) * 0.5;
    ctx.fillStyle = `rgba(127, 208, 232, ${0.14 + pulse * 0.16})`;
    ctx.fillRect(x - 5, top + 1, 10, h - 2);
    ctx.fillStyle = `rgba(127, 208, 232, ${0.06 + pulse * 0.08})`;
    ctx.fillRect(x - 10, top + 5, 20, h - 10);
    rect(ctx, x + 2, deskTop + 3, w - 8, 2, "#7fd0e8aa");
  }
  rect(ctx, x, top, w, 2, "#4a5666");
  rect(ctx, x + w - 2, top, 2, h, "#161c24");
  rect(ctx, x + w - 8, top + h - 7, 3, 3, screenOn ? "#63e6a8" : "#5a2a2a");
}

function drawHair(ctx: Ctx, x: number, baseY: number, hair: string, style: CharacterParts["hair"] | undefined) {
  if (style === "long") {
    rect(ctx, x - 10, baseY - 42, 4, 20, hair);
    rect(ctx, x + 12, baseY - 42, 4, 20, hair);
  } else if (style === "twin") {
    rect(ctx, x - 12, baseY - 40, 4, 14, hair);
    rect(ctx, x + 14, baseY - 40, 4, 14, hair);
  } else if (style === "spiky") {
    rect(ctx, x - 6, baseY - 48, 3, 4, hair);
    rect(ctx, x - 1, baseY - 50, 3, 6, hair);
    rect(ctx, x + 5, baseY - 48, 3, 5, hair);
    rect(ctx, x + 10, baseY - 46, 3, 4, hair);
  }
}

function drawAccessory(
  ctx: Ctx,
  x: number,
  baseY: number,
  accessory: CharacterParts["accessory"] | undefined,
  color: string
) {
  if (accessory === "glasses") {
    rect(ctx, x, baseY - 39, 5, 3, "#2a2a2e");
    rect(ctx, x + 6, baseY - 39, 5, 3, "#2a2a2e");
    rect(ctx, x + 5, baseY - 38, 1, 1, "#2a2a2e");
  } else if (accessory === "headband") {
    rect(ctx, x - 8, baseY - 41, 24, 2, color);
  } else if (accessory === "star") {
    rect(ctx, x + 2, baseY - 20, 3, 3, "#f2c24a");
  }
}

function drawChibiSeated(ctx: Ctx, agent: AgentView, t: number) {
  const { x, y, colors, status, look } = agent;
  const parts = partsFor(look);
  const gender = genderOf(agent.id, look);
  const shirt = parts?.shirt ?? colors.shirt;
  const shirtDark = parts?.shirt ? shadeColor(parts.shirt, 0.74) : colors.shirtDark;
  const hair = parts?.hairColor ?? colors.hair;
  const skin = parts?.skin ?? colors.skin;
  const hairStyle = parts?.hair ?? (look?.avatar ? undefined : gender === "female" ? "long" : "short");
  const bob = status === "thinking" ? Math.sin(t / 400 + x) * 1.2 : 0;
  const baseY = y + bob;
  rect(ctx, x - 6, baseY - 2, 28, 4, "#00000022");

  if (look && isDrawableAvatar(look.avatar) && drawAvatar(ctx, look.avatar, x - 14, baseY - 52, 32, 46)) {
    if (status === "error") rect(ctx, x - 14, baseY - 52, 32, 46, "#b3342f33");
    return;
  }

  if (parts?.accessory === "cape") rect(ctx, x - 8, baseY - 24, 5, 20, "#b3342f");
  rect(ctx, x - 4, baseY - 24, 16, 20, INK);
  rect(ctx, x - 2, baseY - 22, 12, 16, shirt);
  rect(ctx, x + 2, baseY - 22, 4, 12, "#f4f6f8");
  rect(ctx, x + 3, baseY - 20, 2, 8, shirtDark);
  const active = status === "coding" || status === "running_tool";
  const typing = active ? Math.sin(t / 90 + x) * 1.5 : 0;
  const mouseMove = active ? Math.sin(t / 180 + x) * 2 : 0;

  rect(ctx, x + 1, baseY - 21, 5, 8, shirt);
  rect(ctx, x + 2, baseY - 15, 5, 8, shirtDark);
  rect(ctx, x + 3, baseY - 8, 2, 2, "#f4f6f8");
  rect(ctx, x + 2, baseY - 7, 4, 6, skin);
  rect(ctx, x + 1, baseY + 2 + typing, 7, 4, skin);
  rect(ctx, x + 2, baseY + 4 + typing, 3, 2, skin);
  rect(ctx, x + 6, baseY + 2 + typing, 2, 2, skin);

  if (status !== "thinking") {
    rect(ctx, x + 8, baseY - 20, 6, 6, shirt);
    rect(ctx, x + 14, baseY - 18, 9, 5, shirtDark);
    rect(ctx, x + 23, baseY - 16, 6, 5, shirt);
    rect(ctx, x + 28, baseY - 13, 3, 3, "#f4f6f8");
    rect(ctx, x + 28, baseY - 11, 3, 8, skin);
    rect(ctx, x + 31 + mouseMove, baseY + 1, 6, 4, skin);
    rect(ctx, x + 34 + mouseMove, baseY + 3, 2, 2, skin);
  }

  drawHair(ctx, x, baseY, hair, hairStyle);
  rect(ctx, x - 8, baseY - 42, 24, 20, INK);
  rect(ctx, x - 6, baseY - 40, 20, 17, skin);
  rect(ctx, x - 7, baseY - 44, 22, 5, hair);
  rect(ctx, x - 9, baseY - 40, 4, 12, hair);
  rect(ctx, x + 12, baseY - 35, 3, 4, skin);
  rect(ctx, x + 1, baseY - 38, 3, 2, INK);
  rect(ctx, x + 6, baseY - 38, 3, 2, INK);
  rect(ctx, x + 3, baseY - 31, 6, 2, "#a35a44");
  rect(ctx, x + 8, baseY - 22, 2, 16, "#00000022");
  rect(ctx, x + 8, baseY - 40, 4, 17, "#00000012");
  drawAccessory(ctx, x, baseY, parts?.accessory, "#c0392b");
  if (status === "thinking") {
    rect(ctx, x + 7, baseY - 25, 5, 9, shirt);
    rect(ctx, x + 8, baseY - 32, 4, 8, shirtDark);
    rect(ctx, x + 7, baseY - 35, 5, 4, skin);
    rect(ctx, x + 6, baseY - 33, 2, 2, skin);
  }
  if (status === "error") {
    rect(ctx, x - 8, baseY - 44, 24, 20, "#b3342f33");
  }
}

function drawChibiStanding(ctx: Ctx, agent: AgentView, t: number, walking: boolean) {
  const { x, y, colors, look } = agent;
  const parts = partsFor(look);
  const gender = genderOf(agent.id, look);
  const shirt = parts?.shirt ?? colors.shirt;
  const shirtDark = parts?.shirt ? shadeColor(parts.shirt, 0.74) : colors.shirtDark;
  const hair = parts?.hairColor ?? colors.hair;
  const skin = parts?.skin ?? colors.skin;
  const hairStyle = parts?.hair ?? (look?.avatar ? undefined : gender === "female" ? "long" : "short");
  const phase = t / 90 + x * 0.35;
  const swing = walking ? Math.sin(phase) : 0;
  const bob = walking ? Math.abs(Math.sin(phase)) * 1.2 : 0;
  const baseY = y - bob;
  rect(ctx, x - 14, y + 4, 30, 6, "#00000033");

  if (look && isDrawableAvatar(look.avatar) && drawAvatar(ctx, look.avatar, x - 16, baseY - 52, 32, 50)) {
    return;
  }

  if (parts?.accessory === "cape") rect(ctx, x - 8, baseY - 32, 5, 22, "#b3342f");
  if (gender === "female") {
    rect(ctx, x - 8, baseY - 14 + swing * 1.4, 18, 10, colors.pants);
    rect(ctx, x - 8, baseY - 5 + swing * 1.4, 18, 2, "#00000022");
    rect(ctx, x - 5, baseY - 12 + swing * 1.4, 5, 8, skin);
    rect(ctx, x + 2, baseY - 12 - swing * 1.4, 5, 8, skin);
  } else {
    rect(ctx, x - 6, baseY - 14 + swing * 2.2, 5, 15, colors.pants);
    rect(ctx, x + 4, baseY - 14 - swing * 2.2, 5, 15, colors.pants);
  }
  rect(ctx, x - 8 + swing * 1.6, baseY - 2 + swing * 3, 6, 3, "#1f1a16");
  rect(ctx, x + 3 - swing * 1.6, baseY - 2 - swing * 3, 6, 3, "#1f1a16");

  drawHair(ctx, x, baseY, hair, hairStyle);
  rect(ctx, x - 9, baseY - 32, 20, 18, INK);
  rect(ctx, x - 7, baseY - 30, 16, 15, shirt);
  rect(ctx, x - 2, baseY - 30, 5, 11, "#f4f6f8");
  rect(ctx, x - 12, baseY - 28 + swing * 3, 4, 12, shirt);
  rect(ctx, x + 10, baseY - 28 - swing * 3, 4, 12, shirt);
  rect(ctx, x - 13, baseY - 15 + swing * 3, 4, 3, skin);
  rect(ctx, x + 9, baseY - 15 - swing * 3, 4, 3, skin);
  rect(ctx, x - 12, baseY - 44, 24, 20, INK);
  rect(ctx, x - 10, baseY - 42, 20, 17, skin);
  rect(ctx, x - 11, baseY - 46, 22, 5, hair);
  rect(ctx, x - 13, baseY - 42, 4, 12, hair);
  rect(ctx, x - 4, baseY - 40, 3, 2, INK);
  rect(ctx, x + 3, baseY - 40, 3, 2, INK);
  rect(ctx, x - 1, baseY - 33, 6, 2, "#a35a44");
  rect(ctx, x + 7, baseY - 30, 2, 15, "#00000022");
  rect(ctx, x + 7, baseY - 42, 4, 17, "#00000012");
  drawAccessory(ctx, x, baseY, parts?.accessory, "#c0392b");
}

function drawBubble(ctx: Ctx, agent: AgentView, t: number) {
  const { x, y, status } = agent;
  const bx = x;
  const by = y - 76;
  const box = (w: number, h: number, fill = "#f4f6f8") => {
    rect(ctx, bx - w / 2 - 2, by - h - 2, w + 4, h + 4, "#252c36");
    rect(ctx, bx - w / 2, by - h, w, h, fill);
    rect(ctx, bx - 4, by, 8, 4, fill);
    rect(ctx, bx - 2, by + 4, 4, 3, "#252c36");
  };
  if (status === "thinking") {
    box(30, 20);
    const dots = 1 + (Math.floor(t / 350) % 3);
    for (let i = 0; i < dots; i++) {
      rect(ctx, bx - 8 + i * 7, by - 9, 4, 4, "#3a4658");
    }
  } else if (status === "coding") {
    box(30, 22);
    rect(ctx, bx - 11, by - 18, 22, 14, "#26374d");
    rect(ctx, bx - 8, by - 15, 9, 2, "#83c8dc");
    rect(ctx, bx - 8, by - 11, 13, 2, "#6884a0");
    const spark = Math.floor(t / 160) % 2;
    rect(ctx, bx + 12, by - 20 + spark * 3, 3, 3, "#f2d24a");
    rect(ctx, bx - 15, by - 16 - spark * 2, 3, 3, "#f2d24a");
  } else if (status === "running_tool") {
    box(32, 22, "#1a2430");
    ctx.fillStyle = "#63e6a8";
    ctx.font = "bold 10px ui-monospace, Consolas, monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(">_", bx - 10, by - 9);
  } else if (status === "talking") {
    box(34, 22);
    rect(ctx, bx - 10, by - 15, 20, 2, "#3a4658");
    rect(ctx, bx - 10, by - 10, 14, 2, "#3a4658");
    rect(ctx, bx - 10, by - 5, 17, 2, "#3a4658");
  } else if (status === "error") {
    box(22, 22, "#ffd9d6");
    ctx.fillStyle = "#b3342f";
    ctx.font = "bold 16px ui-monospace, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("!", bx, by - 11);
  } else {
    box(18, 18);
    rect(ctx, bx - 5, by - 12, 10, 8, "#f4f6f8");
    rect(ctx, bx - 3, by - 16, 6, 2, "#d8dce2");
    rect(ctx, bx - 6, by - 12, 2, 8, "#c9cfd8");
    rect(ctx, bx + 5, by - 12, 2, 8, "#c9cfd8");
    const steam = Math.floor(t / 400) % 3;
    rect(ctx, bx - 2, by - 20 - steam, 2, 2, "#c9cfd8");
    rect(ctx, bx + 2, by - 22 + steam, 2, 2, "#c9cfd8");
  }
}

function drawNameplate(ctx: Ctx, agent: AgentView, selected: boolean) {
  ctx.font = "bold 10px ui-monospace, Consolas, monospace";
  const label = agent.name.length > 22 ? `${agent.name.slice(0, 21)}…` : agent.name;
  const width = ctx.measureText(label).width + 18;
  const y = agent.y - 58;
  rect(ctx, agent.x - width / 2 - 2, y - 14, width + 4, 20, selected ? "#f2c24a" : "#252c36");
  rect(ctx, agent.x - width / 2, y - 12, width, 16, selected ? "#ffe9a8" : "#33405a");
  rect(ctx, agent.x - width / 2 + 4, y - 8, 4, 4, agent.colors.shirt);
  ctx.fillStyle = selected ? "#252c36" : "#f4f6f8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, agent.x + 2, y - 3);
}

type Box = { x: number; y: number; w: number; h: number };

function nameplateBox(ctx: Ctx, agent: AgentView): Box {
  ctx.font = "bold 10px ui-monospace, Consolas, monospace";
  const label = agent.name.length > 22 ? `${agent.name.slice(0, 21)}…` : agent.name;
  const width = ctx.measureText(label).width + 18;
  return { x: agent.x - width / 2 - 2, y: agent.y - 72, w: width + 4, h: 20 };
}

function overlaps(a: Box, b: Box): boolean {
  return !(a.x + a.w + 2 < b.x || b.x + b.w + 2 < a.x || a.y + a.h + 2 < b.y || b.y + b.h + 2 < a.y);
}

export function drawScene(
  ctx: Ctx,
  width: number,
  height: number,
  agents: AgentView[],
  t: number,
  selectedId: string | null,
  screenStates: boolean[] = [],
  activeStates: boolean[] = [],
  hoverId: string | null = null,
  theme: ThemeName = "fuego",
  groupNames: Record<string, string> = {}
) {
  applyTheme(theme);
  ctx.imageSmoothingEnabled = false;
  drawFloor(ctx, width, height);
  drawCorridors(ctx);
  drawTopWall(ctx, width);
  rect(ctx, 0, 140, width, 10, "#1a335822");
  ctx.save();
  ctx.translate(0, 380);
  drawCafe(ctx);
  drawMeeting(ctx);
  ctx.restore();
  drawBathroom(ctx);
  drawPasillo(ctx);
  drawRooms(ctx);
  drawUpperAisles(ctx);
  drawEntrance(ctx);
  drawReception(ctx);
  for (const area of AREAS) {
    const label = GROUP_AREA_IDS.has(area.id)
      ? groupNames[area.label]?.trim() || "SIN NOMBRE"
      : area.label;
    drawAreaLabel(ctx, area.x + area.w / 2, area.y + 22, label);
  }

  const receptionist: AgentView = {
    id: "reception",
    name: "RECEPCIÓN",
    status: "idle",
    logs: [],
    x: RECEPTION_DESK.seatX,
    y: RECEPTION_DESK.seatY,
    walking: false,
    seated: true,
    colors: agentColors("receptionist"),
    look: {
      name: "Recepcionista",
      parts: {
        hair: "twin",
        hairColor: "#5b3520",
        shirt: "#2f6fbf",
        skin: "#e8b98f",
        accessory: "headband"
      }
    }
  };
  const sorted = [...agents, receptionist].sort((a, b) => a.y - b.y);

  for (const agent of sorted) {
    if (!agent.seated || agent.id === "reception") continue;
    drawPerson(ctx, {
      x: agent.x,
      y: agent.y,
      colors: agent.colors,
      parts: partsFor(agent.look),
      look: agent.look,
      gender: genderOf(agent.id, agent.look),
      pose: "sit",
      facing: 1,
      status: agent.status,
      time: t
    });
    drawSeatedLegs(ctx, { x: agent.x, y: agent.y, colors: agent.colors });
  }

  for (let i = 0; i < WORKSTATIONS.length; i++) {
    drawCubicle(ctx, WORKSTATIONS[i].cubicle, i, screenStates[i] ?? false, activeStates[i] ?? false, t);
  }
  for (const agent of sorted) {
    if (!agent.seated) continue;
    drawDeskArms(ctx, {
      x: agent.x,
      y: agent.id === "reception" ? agent.y : agent.y + 8,
      handY: agent.id === "reception" ? agent.y : agent.y - SEAT_Y_OFFSET,
      colors: agent.colors,
      parts: partsFor(agent.look),
      active: true,
      time: t
    });
  }

  const priority: AgentView[] = [];
  const labels: AgentView[] = [];
  for (const agent of sorted) {
    if (agent.id === selectedId || agent.id === hoverId) priority.push(agent);
    else labels.push(agent);
    if (!agent.seated || agent.id === "reception") {
      drawPerson(ctx, {
        x: agent.x,
        y: agent.y,
        colors: agent.colors,
        parts: partsFor(agent.look),
        look: agent.look,
        gender: genderOf(agent.id, agent.look),
        pose: agent.seated ? "sit" : "stand",
        facing: 1,
        status: agent.status,
        walking: agent.walking,
        time: t
      });
    }
    if (agent.id !== "reception" && agent.status !== "talking") drawBubble(ctx, agent, t);
  }

  const boxes: Box[] = priority.map((agent) => nameplateBox(ctx, agent));
  for (const agent of labels) {
    const box = nameplateBox(ctx, agent);
    if (boxes.some((other) => overlaps(box, other))) continue;
    boxes.push(box);
    drawNameplate(ctx, agent, false);
  }
  for (const agent of priority) {
    drawNameplate(ctx, agent, true);
  }

  const talking = agents.filter((agent) => agent.status === "talking");
  for (let i = 0; i < talking.length; i++) {
    for (let j = i + 1; j < talking.length; j++) {
      const a = talking[i];
      const b = talking[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) < 130) {
        const mx = (a.x + b.x) / 2;
        const my = Math.min(a.y, b.y) - 74;
        rect(ctx, mx - 20, my - 18, 40, 22, "#252c36");
        rect(ctx, mx - 18, my - 16, 36, 18, "#f4f6f8");
        rect(ctx, mx - 12, my - 11, 24, 2, "#3a4658");
        rect(ctx, mx - 12, my - 6, 18, 2, "#3a4658");
      }
    }
  }
}

export function drawCharacterPreview(canvas: HTMLCanvasElement, parts?: CharacterParts, look?: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const scale = 1.8;
  const width = 84;
  const height = 112;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
  ctx.clearRect(0, 0, width / scale, height / scale);
  ctx.imageSmoothingEnabled = false;
  const lookValue: CharacterLook | undefined = look ? { avatar: look } : undefined;
  drawPerson(ctx, {
    x: width / scale / 2,
    y: height / scale - 10,
    colors: agentColors("preview"),
    parts: parts ?? (lookValue ? partsFor(lookValue) : undefined),
    look: lookValue,
    gender: genderOf("preview", lookValue),
    pose: "stand",
    status: "idle",
    time: performance.now()
  });
}
