import { PODS, type DeskPod, type RoomLabel } from "./layout";
import { isImageAvatar, type CharacterParts, type HairStyle } from "../characters";

export type Action = "idle" | "write" | "read" | "bash" | "permission" | "retry" | "error" | "walk" | "coffee";

export type ThemeName = "fuego" | "rubi" | "esmeralda";

export type Palette = {
  wall: string;
  wallDark: string;
  wallLine: string;
  floorA: string;
  floorB: string;
  floorLine: string;
  rug: string;
  rugDark: string;
  rugLine: string;
  sky1: string;
  sky2: string;
  gold: string;
  maroon: string;
};

export const PALETTES: Record<ThemeName, Palette> = {
  fuego: {
    wall: "#f7f3ea",
    wallDark: "#ddd5c3",
    wallLine: "#ebe5d8",
    floorA: "#d6d2ca",
    floorB: "#cecac2",
    floorLine: "#bdb8af",
    rug: "#a83434",
    rugDark: "#9a2f2f",
    rugLine: "#8a2828",
    sky1: "#7fc7e8",
    sky2: "#d6f0f7",
    gold: "#e0a92e",
    maroon: "#8c2f2f"
  },
  rubi: {
    wall: "#e3e9f1",
    wallDark: "#c6d0dc",
    wallLine: "#d7dfe8",
    floorA: "#c4ccd4",
    floorB: "#bbc3cb",
    floorLine: "#a9b1b9",
    rug: "#a83434",
    rugDark: "#9a2f2f",
    rugLine: "#8a2828",
    sky1: "#86cbe8",
    sky2: "#dcf3fa",
    gold: "#c98a1e",
    maroon: "#8c2f2f"
  },
  esmeralda: {
    wall: "#e6eeda",
    wallDark: "#cbd8bd",
    wallLine: "#dbe5cf",
    floorA: "#c4cdb6",
    floorB: "#bbc4ac",
    floorLine: "#a8b199",
    rug: "#2f6f5a",
    rugDark: "#28604e",
    rugLine: "#21503f",
    sky1: "#86cbe8",
    sky2: "#dcf3fa",
    gold: "#d0a01e",
    maroon: "#2f6f5a"
  }
};

export type DrawAgent = {
  id: string;
  name: string;
  title: string;
  directory: string;
  action: Action;
  tool?: string;
  x: number;
  y: number;
  scale: number;
  child: boolean;
  spawnAt?: number;
  look?: string;
  parts?: CharacterParts;
  dir?: 1 | -1;
  color: {
    shirt: string;
    jacket: string;
    tie: string;
    hair: string;
    hairStyle: HairStyle;
    accent: string;
    skin: string;
    skirt: boolean;
    bun: boolean;
    glasses: boolean;
  };
};

const P = 3;

const INK = "#2a1a10";
const CREAM = "#f4e8cc";
const CREAM_DARK = "#e2d0a8";
const WOOD = "#8a5a3b";
const WOOD_LIGHT = "#a06a45";
const WOOD_DARK = "#5b3520";
const GOLD = "#e0a92e";

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

const SKINS = ["#f0c090", "#e8b98f", "#d79a6a", "#b97a4e", "#8d5a38"];

export function colorFor(id: string): {
  shirt: string;
  jacket: string;
  tie: string;
  hair: string;
  hairStyle: HairStyle;
  accent: string;
  skin: string;
  skirt: boolean;
  bun: boolean;
  glasses: boolean;
} {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return {
    shirt: `hsl(${hue} 42% 52%)`,
    jacket: `hsl(${hue} 40% 36%)`,
    tie: ["#8c2f2f", "#2f5f88", "#c98a1e", "#2f6f5a"][hash % 4],
    hair: ["#3a2a1a", "#5b3520", "#1f1a16", "#6e4a1e", "#2a2a3a"][hash % 5],
    hairStyle: (["short", "long", "spiky", "twin"] as HairStyle[])[(hash >> 5) % 4],
    accent: `hsl(${hue} 70% 62%)`,
    skin: SKINS[(hash >> 3) % SKINS.length],
    skirt: hash % 2 === 0,
    bun: (hash >> 2) % 3 === 0,
    glasses: (hash >> 4) % 3 === 0
  };
}

export function actionFor(tool: string | undefined): Action {
  if (!tool) return "idle";
  if (["edit", "write", "patch", "multiedit"].includes(tool)) return "write";
  if (["read", "grep", "glob", "list", "webfetch", "websearch"].includes(tool)) return "read";
  if (["bash", "shell", "task"].includes(tool)) return "bash";
  return "write";
}

function screenColor(action: Action): string {
  switch (action) {
    case "write":
      return "#2f8f7f";
    case "read":
      return "#2f5f88";
    case "bash":
      return "#1f6b4a";
    case "permission":
    case "retry":
      return "#8a6a1e";
    case "error":
      return "#7a2a2a";
    default:
      return "#274050";
  }
}

function drawRoom(ctx: CanvasRenderingContext2D, width: number, height: number, t: number, p: Palette) {
  const tile = 48;
  for (let y = 0; y < height; y += tile) {
    for (let x = 0; x < width; x += tile) {
      const even = ((x / tile) | 0) % 2 === ((y / tile) | 0) % 2;
      rect(ctx, x, y, tile, tile, even ? p.floorA : p.floorB);
      rect(ctx, x, y, tile, 1, p.floorLine);
      rect(ctx, x, y, 1, tile, p.floorLine);
    }
  }
  for (let i = 0; i < 170; i++) {
    const sx = (i * 97) % width;
    const sy = 160 + ((i * 53) % (height - 190));
    rect(ctx, sx, sy, 1, 1, "#ffffff1c");
  }

  for (const [lx, ly] of [
    [340, 470],
    [760, 470],
    [340, 720],
    [760, 720],
    [150, 560]
  ]) {
    const glow = ctx.createRadialGradient(lx, ly, 8, lx, ly, 150);
    glow.addColorStop(0, "#ffffff1f");
    glow.addColorStop(1, "#ffffff00");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lx, ly, 150, 0, Math.PI * 2);
    ctx.fill();
  }

  rect(ctx, 0, 0, 22, height, p.wall);
  rect(ctx, 18, 0, 4, height, p.wallDark);
  rect(ctx, 0, 0, 3, height, "#ffffffaa");
  rect(ctx, width - 22, 0, 22, height, p.wall);
  rect(ctx, width - 22, 0, 4, height, p.wallDark);
  rect(ctx, width - 3, 0, 3, height, "#00000011");

  const wallH = 150;
  rect(ctx, 0, 0, width, wallH, p.wall);
  for (let x = 30; x < width - 30; x += 120) {
    rect(ctx, x, 10, 1, wallH - 32, p.wallLine);
  }
  rect(ctx, 0, 0, width, 6, p.wallDark);
  rect(ctx, 0, 6, width, 2, "#ffffff88");
  rect(ctx, 0, wallH - 22, width, 22, "#ece5d7");
  rect(ctx, 0, wallH - 22, width, 3, "#ffffffaa");
  rect(ctx, 0, wallH - 19, width, 2, p.wallLine);
  rect(ctx, 0, wallH - 10, width, 10, WOOD);
  rect(ctx, 0, wallH - 10, width, 2, WOOD_LIGHT);
  rect(ctx, 0, wallH - 1, width, 1, "#00000022");

  const signW = 186;
  rect(ctx, 30, 18, signW, 34, "#2f3e52");
  rect(ctx, 33, 21, signW - 6, 28, "#3d5068");
  rect(ctx, 38, 30, 4, 4, p.gold);
  ctx.fillStyle = "#f7f7f2";
  ctx.font = "bold 13px ui-monospace, Consolas, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("PIXEL OFFICE", 30 + signW / 2 + 3, 39);

  const doorW = 86;
  const doorX = width - doorW - 56;
  rect(ctx, doorX - 8, 26, doorW + 16, 112, "#b9ad99");
  rect(ctx, doorX - 4, 30, doorW + 8, 104, "#f7f3ea");
  rect(ctx, doorX, 34, doorW, 100, "#8a6a4a");
  rect(ctx, doorX + 5, 39, doorW - 10, 42, "#a8d6e8");
  rect(ctx, doorX + 5, 85, doorW - 10, 44, "#a8d6e8");
  rect(ctx, doorX + 5, 39, doorW - 10, 42, "#ffffff33");
  rect(ctx, doorX + doorW - 20, 82, 6, 6, p.gold);
  rect(ctx, doorX + 14, 16, doorW - 28, 12, "#2f3e52");
  ctx.fillStyle = "#f7f7f2";
  ctx.font = "bold 8px ui-monospace, Consolas, monospace";
  ctx.fillText("EXIT", doorX + doorW / 2, 22);

  const windowCount = 3;
  const available = width - doorW - 120 - 240;
  const winW = Math.min(180, Math.floor(available / windowCount) - 36);
  const gap = (available - winW * windowCount) / (windowCount + 1);
  for (let i = 0; i < windowCount; i++) {
    const x = 220 + gap + i * (winW + gap);
    drawWindow(ctx, x, 28, winW, 88, p);
  }

  drawClock(ctx, 150, 64, t, p);

  rect(ctx, 0, height - 22, width, 22, p.wall);
  rect(ctx, 0, height - 22, width, 3, "#ffffffaa");
  rect(ctx, 0, height - 19, width, 2, p.wallLine);
  rect(ctx, 0, height - 8, width, 8, WOOD);
  rect(ctx, 0, height - 8, width, 2, WOOD_LIGHT);
}

function drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, p: Palette) {
  rect(ctx, x - 8, y - 8, w + 16, h + 16, "#b9ad99");
  rect(ctx, x - 4, y - 4, w + 8, h + 8, "#f7f3ea");
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, p.sky1);
  sky.addColorStop(1, p.sky2);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  rect(ctx, x + 12, y + 16, 30, 8, "#ffffffcc");
  rect(ctx, x + 20, y + 10, 18, 8, "#ffffffcc");
  rect(ctx, x + w - 52, y + 34, 34, 8, "#ffffffcc");

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = "#ffffff3d";
  ctx.lineWidth = 4;
  for (let i = -h; i < w; i += 22) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i + h, y + h);
    ctx.stroke();
  }
  ctx.restore();

  rect(ctx, x + w / 2 - 2, y, 4, h, "#f7f3ea");
  rect(ctx, x, y + h / 2 - 2, w, 4, "#f7f3ea");
  rect(ctx, x - 10, y + h + 4, w + 20, 8, WOOD);
  rect(ctx, x - 10, y + h + 4, w + 20, 2, WOOD_LIGHT);
}

function drawClock(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, p: Palette) {
  ctx.beginPath();
  ctx.arc(x, y, 24, 0, Math.PI * 2);
  ctx.fillStyle = WOOD_DARK;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fillStyle = CREAM;
  ctx.fill();
  const minute = (t / 1000) % 60;
  const hour = ((t / 60000) % 12) * 5;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos((hour / 60) * Math.PI * 2 - Math.PI / 2) * 11, y + Math.sin((hour / 60) * Math.PI * 2 - Math.PI / 2) * 11);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos((minute / 60) * Math.PI * 2 - Math.PI / 2) * 16, y + Math.sin((minute / 60) * Math.PI * 2 - Math.PI / 2) * 16);
  ctx.stroke();
  rect(ctx, x - 2, y - 2, 4, 4, p.maroon);
}

function drawSofa(ctx: CanvasRenderingContext2D, x: number, y: number) {
  rect(ctx, x, y, 116, 18, "#28447f");
  rect(ctx, x + 4, y + 4, 108, 18, "#3f63b8");
  rect(ctx, x - 6, y + 14, 16, 30, "#2f4f9e");
  rect(ctx, x + 106, y + 14, 16, 30, "#2f4f9e");
  rect(ctx, x, y + 20, 116, 24, "#4a70c8");
  rect(ctx, x + 8, y + 24, 46, 14, "#5a80d8");
  rect(ctx, x + 62, y + 24, 46, 14, "#5a80d8");
  rect(ctx, x + 4, y + 44, 6, 8, WOOD_DARK);
  rect(ctx, x + 106, y + 44, 6, 8, WOOD_DARK);
}

function drawCoffeeTable(ctx: CanvasRenderingContext2D, x: number, y: number) {
  rect(ctx, x, y, 62, 10, WOOD_LIGHT);
  rect(ctx, x, y + 10, 62, 4, WOOD);
  rect(ctx, x + 4, y + 14, 5, 14, WOOD_DARK);
  rect(ctx, x + 53, y + 14, 5, 14, WOOD_DARK);
  rect(ctx, x + 10, y + 2, 10, 6, CREAM);
  rect(ctx, x + 12, y, 6, 4, "#b07a3a");
}

function drawWhiteboard(ctx: CanvasRenderingContext2D, x: number, y: number) {
  rect(ctx, x, y, 76, 96, WOOD_DARK);
  rect(ctx, x + 4, y + 4, 68, 84, CREAM);
  rect(ctx, x + 10, y + 12, 26, 4, "#2f5f88");
  rect(ctx, x + 10, y + 22, 44, 3, "#8a6a3a");
  rect(ctx, x + 10, y + 30, 36, 3, "#8a6a3a");
  rect(ctx, x + 10, y + 44, 16, 16, "#e8b23a");
  rect(ctx, x + 32, y + 44, 16, 16, "#5aa064");
  rect(ctx, x + 54, y + 44, 12, 16, "#a85a5a");
  rect(ctx, x + 8, y + 84, 8, 6, "#8c2f2f");
  rect(ctx, x + 60, y + 84, 8, 6, "#2f5f88");
  rect(ctx, x + 6, y + 96, 5, 16, WOOD_DARK);
  rect(ctx, x + 65, y + 96, 5, 16, WOOD_DARK);
}

function drawPrinter(ctx: CanvasRenderingContext2D, x: number, y: number) {
  rect(ctx, x, y + 18, 74, 44, WOOD_DARK);
  rect(ctx, x + 4, y + 22, 66, 40, WOOD);
  rect(ctx, x + 4, y - 10, 66, 34, "#c8c2b4");
  rect(ctx, x + 8, y - 6, 58, 20, "#e0dbd0");
  rect(ctx, x + 12, y + 2, 50, 4, "#a8a294");
  rect(ctx, x + 16, y - 14, 42, 6, CREAM);
  rect(ctx, x + 52, y + 12, 10, 6, "#2f6f6a");
}

function drawCoffee(ctx: CanvasRenderingContext2D, x: number, y: number) {
  rect(ctx, x, y - 36, 54, 36, "#2f343a");
  rect(ctx, x + 3, y - 33, 48, 9, "#4a525a");
  rect(ctx, x + 4, y - 22, 20, 14, "#7fc7e8");
  rect(ctx, x + 6, y - 20, 16, 10, "#a8dff0");
  rect(ctx, x + 28, y - 22, 16, 12, "#1f2328");
  rect(ctx, x + 30, y - 8, 12, 4, "#c8c2b4");
  rect(ctx, x + 44, y - 22, 6, 6, "#b3342f");
  rect(ctx, x + 31, y - 3, 9, 7, CREAM);
  rect(ctx, x + 31, y - 3, 9, 2, "#b07a3a");
}

function wallBlock(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  rect(ctx, x, y, w, h, "#b9ad99");
  rect(ctx, x + 2, y + 2, w - 4, h - 4, "#fbf8f2");
  if (w >= h) {
    rect(ctx, x + 2, y + 2, w - 4, 2, "#ffffffcc");
    rect(ctx, x + 2, y + h - 4, w - 4, 2, "#00000018");
  } else {
    rect(ctx, x + 2, y + 2, 2, h - 4, "#ffffffcc");
    rect(ctx, x + w - 4, y + 2, 2, h - 4, "#00000018");
  }
}

function drawRoomLabel(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
  ctx.font = "bold 10px ui-monospace, Consolas, monospace";
  const width = ctx.measureText(text).width + 22;
  rect(ctx, x - width / 2 - 2, y - 12, width + 4, 20, "#2f3e52");
  rect(ctx, x - width / 2, y - 10, width, 16, "#3d5068");
  rect(ctx, x - width / 2 + 4, y - 6, 4, 4, GOLD);
  ctx.fillStyle = "#f7f7f2";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 2, y - 1);
}

function drawEntranceDoor(ctx: CanvasRenderingContext2D, x: number, y: number) {
  rect(ctx, x, y, 30, 76, WOOD_DARK);
  rect(ctx, x + 3, y + 3, 24, 70, WOOD);
  rect(ctx, x + 6, y + 8, 18, 28, WOOD_LIGHT);
  rect(ctx, x + 6, y + 42, 18, 26, WOOD_LIGHT);
  rect(ctx, x + 22, y + 38, 4, 4, GOLD);
  rect(ctx, x, y + 80, 34, 10, CREAM);
  ctx.fillStyle = INK;
  ctx.font = "bold 7px ui-monospace, Consolas, monospace";
  ctx.textAlign = "center";
  ctx.fillText("ENTRADA", x + 15, y + 87);
}

function drawStool(ctx: CanvasRenderingContext2D, x: number, y: number, color = "#2f6fbf") {
  rect(ctx, x - 12, y - 20, 24, 12, color);
  rect(ctx, x - 10, y - 18, 20, 8, "#ffffff22");
  rect(ctx, x - 14, y - 8, 28, 6, "#2e2f38");
  rect(ctx, x - 10, y - 2, 4, 10, "#2e2f38");
  rect(ctx, x + 6, y - 2, 4, 10, "#2e2f38");
}

function drawSideTable(ctx: CanvasRenderingContext2D, x: number, y: number) {
  rect(ctx, x, y, 22, 26, WOOD_DARK);
  rect(ctx, x + 2, y + 2, 18, 22, WOOD_LIGHT);
  rect(ctx, x + 6, y - 7, 10, 8, CREAM);
  rect(ctx, x + 6, y - 7, 10, 2, "#b07a3a");
  rect(ctx, x + 8, y - 13, 2, 6, "#8a5a3b");
  rect(ctx, x + 13, y - 14, 2, 7, "#8a5a3b");
}

function drawPodBase(ctx: CanvasRenderingContext2D, pod: DeskPod) {
  const { x, y, length, width, slots } = pod;
  const half = width / 2;
  rect(ctx, x - half - 44, y + 4, 10, length - 8, "#9fb0c9");
  rect(ctx, x - half - 44, y + 4, 4, length - 8, "#d7dde6");
  rect(ctx, x + half + 34, y + 4, 10, length - 8, "#9fb0c9");
  rect(ctx, x + half + 34, y + 4, 4, length - 8, "#d7dde6");
  rect(ctx, x - half - 44, y, 10, 6, "#8fa3c0");
  rect(ctx, x - half - 44, y + length - 6, 10, 6, "#8fa3c0");
  rect(ctx, x + half + 34, y, 10, 6, "#8fa3c0");
  rect(ctx, x + half + 34, y + length - 6, 10, 6, "#8fa3c0");
  for (let i = 1; i < slots.length; i++) {
    rect(ctx, x - half - 34, slots[i].y - 40, width + 68, 6, "#d7dde6");
  }
  rect(ctx, x - half + 4, y + 14, 6, 28, WOOD_DARK);
  rect(ctx, x - half + 4, y + length - 42, 6, 28, WOOD_DARK);
  rect(ctx, x + half - 10, y + 14, 6, 28, WOOD_DARK);
  rect(ctx, x + half - 10, y + length - 42, 6, 28, WOOD_DARK);

  let chairIndex = 0;
  for (const slot of slots) {
    const color = CHAIR_COLORS[(chairIndex + Math.floor(x / 100)) % CHAIR_COLORS.length];
    if (slot.dir === -1) {
      rect(ctx, slot.x + 14, slot.y - 50, 10, 44, color);
      rect(ctx, slot.x - 8, slot.y - 10, 28, 6, "#3a3d48");
      rect(ctx, slot.x - 4, slot.y - 4, 4, 10, "#2e2f38");
      rect(ctx, slot.x + 12, slot.y - 4, 4, 10, "#2e2f38");
    } else {
      rect(ctx, slot.x - 24, slot.y - 50, 10, 44, color);
      rect(ctx, slot.x - 20, slot.y - 10, 28, 6, "#3a3d48");
      rect(ctx, slot.x - 16, slot.y - 4, 4, 10, "#2e2f38");
      rect(ctx, slot.x + 4, slot.y - 4, 4, 10, "#2e2f38");
    }
    chairIndex += 1;
  }
}

function drawDeskScreen(ctx: CanvasRenderingContext2D, x: number, slotY: number, dir: 1 | -1) {
  ctx.save();
  ctx.translate(x, 0);
  if (dir === -1) ctx.scale(-1, 1);
  const w = 34;
  const h = 23;
  const top = slotY - 32;
  ctx.beginPath();
  ctx.moveTo(-w / 2, top);
  ctx.lineTo(w / 2 - 9, top - 7);
  ctx.lineTo(w / 2, top + h - 3);
  ctx.lineTo(-w / 2 + 7, top + h);
  ctx.closePath();
  ctx.fillStyle = "#252b35";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 3, top + 3);
  ctx.lineTo(w / 2 - 12, top - 4);
  ctx.lineTo(w / 2 - 6, top + h - 8);
  ctx.lineTo(-w / 2 + 9, top + h - 3);
  ctx.closePath();
  ctx.fillStyle = "#34465f";
  ctx.fill();
  rect(ctx, -w / 2 + 6, top + 6, 12, 2, "#83c8dc");
  rect(ctx, -w / 2 + 6, top + 11, 19, 2, "#6884a0");
  rect(ctx, -w / 2 + 6, top + 16, 15, 2, "#6884a0");
  rect(ctx, -4, top + h, 8, 4, "#4a4d5a");
  rect(ctx, -10, top + h + 4, 20, 3, "#353a44");
  ctx.restore();
}

function drawLaptop(ctx: CanvasRenderingContext2D, x: number, slotY: number, dir: 1 | -1) {
  ctx.save();
  ctx.translate(x, 0);
  if (dir === -1) ctx.scale(-1, 1);
  const top = slotY - 8;
  ctx.beginPath();
  ctx.moveTo(-13, top);
  ctx.lineTo(9, top - 4);
  ctx.lineTo(13, top + 7);
  ctx.lineTo(-9, top + 11);
  ctx.closePath();
  ctx.fillStyle = "#343a44";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-10, top - 14);
  ctx.lineTo(8, top - 17);
  ctx.lineTo(10, top - 3);
  ctx.lineTo(-9, top);
  ctx.closePath();
  ctx.fillStyle = "#c7ccd4";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-8, top - 12);
  ctx.lineTo(6, top - 14);
  ctx.lineTo(8, top - 4);
  ctx.lineTo(-7, top - 2);
  ctx.closePath();
  ctx.fillStyle = "#26374d";
  ctx.fill();
  rect(ctx, -6, top - 10, 10, 2, "#719ab8");
  rect(ctx, -9, top + 2, 17, 1, "#8e95a0");
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 5; col++) rect(ctx, -8 + col * 3, top + 3 + row * 2, 2, 1, "#aeb4bf");
  }
  ctx.restore();
}

function drawPodTop(ctx: CanvasRenderingContext2D, pod: DeskPod) {
  const { x, y, length, width, slots } = pod;
  const half = width / 2;
  const left = x - half;
  rect(ctx, left, y, width, length, WOOD_LIGHT);
  rect(ctx, left, y, 3, length, "#b57a52");
  rect(ctx, left + width - 3, y, 3, length, WOOD);
  for (let sy = y + 24; sy < y + length; sy += 70) {
    rect(ctx, left, sy, width, 2, "#a97a4b");
  }

  const single = slots.length === 1;
  for (const slot of slots) {
    const dir = slot.dir ?? 1;
    const inward = dir === 1 ? -1 : 1;
    const monitorX = single ? x - 10 : x + inward * 20;
    const laptopX = single ? x - 34 : x + inward * 55;
    drawDeskScreen(ctx, monitorX, slot.y, dir);
    drawLaptop(ctx, laptopX, slot.y, dir);
    ctx.fillStyle = "#343a44";
    ctx.beginPath();
    ctx.ellipse(x + inward * 37, slot.y + 8, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    if (single) drawPaper(ctx, x + 24, slot.y + 4);
  }
}

function drawTower(ctx: CanvasRenderingContext2D, x: number, deskTop: number) {
  const top = deskTop - 24;
  rect(ctx, x, top, 12, 24, "#2f3346");
  rect(ctx, x + 1, top + 1, 10, 3, "#3e4458");
  for (let i = 0; i < 4; i++) {
    rect(ctx, x + 2, top + 7 + i * 4, 8, 1, "#4a5170");
  }
  rect(ctx, x + 8, top + 2, 3, 1, "#63d3c0");
}

function drawKeyboard(ctx: CanvasRenderingContext2D, cx: number, deskTop: number) {
  rect(ctx, cx - 16, deskTop + 3, 32, 8, "#3a3d48");
  rect(ctx, cx - 15, deskTop + 4, 30, 2, "#4a4d5a");
  for (let i = 0; i < 6; i++) {
    rect(ctx, cx - 14 + i * 5, deskTop + 7, 3, 1, "#8a8f9e");
  }
}

function drawMouse(ctx: CanvasRenderingContext2D, x: number, deskTop: number) {
  ctx.fillStyle = "#3a3d48";
  ctx.beginPath();
  ctx.ellipse(x, deskTop + 8, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2f3346";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 3, deskTop + 8);
  ctx.quadraticCurveTo(x + 10, deskTop + 2, x + 4, deskTop - 4);
  ctx.stroke();
}

function drawPaper(ctx: CanvasRenderingContext2D, x: number, deskTop: number) {
  rect(ctx, x - 9, deskTop + 2, 18, 12, "#f4f4ec");
  rect(ctx, x - 7, deskTop + 4, 14, 1, "#b9bcc4");
  rect(ctx, x - 7, deskTop + 7, 11, 1, "#b9bcc4");
  rect(ctx, x - 7, deskTop + 10, 13, 1, "#b9bcc4");
}

function drawMonitor(ctx: CanvasRenderingContext2D, cx: number, deskTop: number) {
  const w = 24;
  const h = 32;
  const left = cx - w / 2;
  const top = deskTop - h - 4;

  rect(ctx, cx - 8, deskTop - 2, 16, 3, "#3a3d48");
  rect(ctx, cx - 3, deskTop - 8, 6, 7, "#4a4d5a");

  rect(ctx, left - 2, top - 2, w + 4, h + 4, "#cfd3dd");
  rect(ctx, left, top, w, h, "#2f3346");
  rect(ctx, left + 3, top + 3, w - 6, h - 6, "#3b4160");
  rect(ctx, left + 5, top + 5, 3, h - 12, "#5a6188");
  rect(ctx, left + 3, top + h - 8, w - 6, 3, "#ffffff33");
  rect(ctx, left + w - 5, top + 4, 2, 2, "#63d3c0");
}

function drawFloorPlan(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  labels: RoomLabel[]
) {
  const WH = 8;
  const hWall = (x1: number, x2: number, y: number) => wallBlock(ctx, x1, y, x2 - x1, WH);
  const vWall = (x: number, y1: number, y2: number) => wallBlock(ctx, x, y1, WH, y2 - y1);

  rect(ctx, 26, 360, 1228, 55, "#eae6de");
  rect(ctx, 26, 360, 1228, 2, "#c3a878");
  rect(ctx, 26, 413, 1228, 2, "#c3a878");
  rect(ctx, 895, 415, 55, 425, "#eae6de");
  rect(ctx, 895, 415, 2, 425, "#c3a878");
  rect(ctx, 948, 415, 2, 425, "#c3a878");
  rect(ctx, 26, 460, 26, 90, "#eae6de");
  for (let x = 40; x < 1240; x += 40) {
    rect(ctx, x, 362, 1, 51, "#cfcdc6");
  }
  for (let y = 372; y < 413; y += 20) {
    rect(ctx, 26, y, 1228, 1, "#cfcdc6");
  }
  for (let y = 420; y < 840; y += 40) {
    rect(ctx, 895, y, 53, 1, "#cfcdc6");
  }

  vWall(320, 150, 360);
  vWall(640, 150, 360);
  hWall(40, 190, 352);
  hWall(240, 320, 352);
  hWall(328, 440, 352);
  hWall(490, 640, 352);
  hWall(648, 840, 352);
  hWall(890, 1240, 352);

  vWall(300, 415, 500);
  vWall(300, 550, 655);
  hWall(40, 120, 655);
  hWall(170, 300, 655);
  vWall(300, 665, 740);
  vWall(300, 790, 840);

  vWall(895, 415, 590);
  vWall(895, 650, 840);
  vWall(950, 415, 500);
  vWall(950, 550, 750);
  hWall(958, 975, 750);
  hWall(995, 1060, 750);
  hWall(1080, 1240, 750);
  vWall(958, 758, 785);
  vWall(958, 805, 840);
  vWall(1120, 758, 840);

  hWall(40, 300, 840);
  hWall(360, 1240, 840);

  drawEntranceDoor(ctx, 0, 470);

  const door = (x: number, y: number, w: number, h: number) => {
    rect(ctx, x, y, w, h, "#c3a878");
    rect(ctx, x, y, w, 2, "#8a5a3b");
  };
  door(190, 352, 50, 8);
  door(440, 352, 50, 8);
  door(840, 352, 50, 8);
  door(300, 500, 8, 50);
  door(300, 740, 8, 50);
  door(895, 590, 8, 60);
  door(950, 500, 8, 50);
  door(975, 750, 20, 8);
  door(1060, 750, 20, 8);
  door(958, 785, 8, 20);
  door(300, 840, 60, 8);

  const leafUp = (x: number, y: number) => {
    rect(ctx, x, y - 42, 8, 42, "#8a6a4a");
    rect(ctx, x + 2, y - 40, 4, 38, "#a07a52");
    rect(ctx, x + 6, y - 22, 2, 2, GOLD);
  };
  const leafRight = (x: number, y: number) => {
    rect(ctx, x + 2, y, 42, 8, "#8a6a4a");
    rect(ctx, x + 4, y + 2, 38, 4, "#a07a52");
    rect(ctx, x + 22, y + 6, 2, 2, GOLD);
  };
  leafUp(190, 352);
  leafUp(440, 352);
  leafUp(840, 352);
  leafRight(300, 500);
  leafRight(300, 740);
  leafRight(895, 590);
  leafRight(950, 500);

  const tableX = 390;
  const tableY = 225;
  rect(ctx, tableX, tableY, 160, 70, WOOD_DARK);
  rect(ctx, tableX + 4, tableY + 4, 152, 62, WOOD_LIGHT);
  for (let i = 0; i < 3; i++) {
    rect(ctx, tableX + 24 + i * 48, tableY - 16, 26, 14, "#3b5568");
    rect(ctx, tableX + 24 + i * 48, tableY + 78, 26, 14, "#3b5568");
  }

  rect(ctx, 660, 200, 580, 28, WOOD_DARK);
  rect(ctx, 662, 202, 576, 22, WOOD_LIGHT);
  rect(ctx, 780, 206, 36, 14, "#9fb4c0");
  rect(ctx, 784, 209, 28, 8, "#c9dbe3");
  drawCoffee(ctx, 700, 200);
  rect(ctx, 1170, 190, 54, 96, "#dfe6ea");
  rect(ctx, 1174, 194, 46, 88, "#eef3f5");
  rect(ctx, 1174, 238, 46, 2, "#b9c4c9");
  rect(ctx, 1208, 214, 4, 14, "#8a95a0");
  drawCooler(ctx, 1120, 210);
  rect(ctx, 820, 255, 84, 44, WOOD_DARK);
  rect(ctx, 824, 259, 76, 36, WOOD_LIGHT);
  rect(ctx, 838, 267, 12, 10, CREAM);
  rect(ctx, 862, 267, 12, 10, CREAM);
  rect(ctx, 830, 307, 18, 12, "#3b5568");
  rect(ctx, 856, 307, 18, 12, "#3b5568");
  rect(ctx, 882, 307, 18, 12, "#3b5568");

  rect(ctx, 55, 550, 202, 102, "#c9d3e4");
  rect(ctx, 55, 550, 202, 4, "#3d5068");
  rect(ctx, 55, 648, 202, 4, "#3d5068");
  rect(ctx, 55, 550, 4, 102, "#3d5068");
  rect(ctx, 253, 550, 4, 102, "#3d5068");
  rect(ctx, 90, 500, 150, 26, WOOD_DARK);
  rect(ctx, 94, 504, 142, 18, WOOD_LIGHT);
  rect(ctx, 140, 484, 40, 16, "#1b232b");
  rect(ctx, 143, 487, 34, 10, "#2f5f88");
  drawSofa(ctx, 70, 590);
  drawCoffeeTable(ctx, 210, 600);
  drawPlant(ctx, 250, 470);

  drawPrinter(ctx, 90, 750);
  rect(ctx, 200, 700, 70, 100, WOOD_DARK);
  rect(ctx, 204, 704, 62, 92, WOOD);
  for (let i = 0; i < 3; i++) {
    rect(ctx, 204, 728 + i * 26, 62, 3, WOOD_LIGHT);
  }

  rect(ctx, 975, 770, 20, 10, "#dfe6ea");
  rect(ctx, 979, 772, 12, 6, "#9fb4c0");
  rect(ctx, 975, 792, 18, 6, "#dfe6ea");
  rect(ctx, 977, 798, 14, 26, "#f4f7f8");
  rect(ctx, 1055, 770, 20, 10, "#dfe6ea");
  rect(ctx, 1059, 772, 12, 6, "#9fb4c0");
  rect(ctx, 1055, 792, 18, 6, "#dfe6ea");
  rect(ctx, 1057, 798, 14, 26, "#f4f7f8");

  drawPlant(ctx, 40, 220);
  drawPlant(ctx, 1205, 700);
  drawPlant(ctx, 1180, 430);
  drawPlant(ctx, 330, 760);

  rect(ctx, 78, 676, 52, 58, "#a8b2bd");
  rect(ctx, 82, 680, 44, 50, "#c3ccd6");
  for (let i = 0; i < 3; i++) {
    rect(ctx, 84, 684 + i * 16, 40, 12, "#aeb8c4");
    rect(ctx, 100, 688 + i * 16, 10, 3, "#6b7683");
  }

  for (const deskPod of PODS) {
    drawPodBase(ctx, deskPod);
  }

  for (const label of labels) {
    drawRoomLabel(ctx, label.x, label.y, label.text);
  }
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number) {
  rect(ctx, x, y + 40, 34, 28, WOOD_DARK);
  rect(ctx, x + 3, y + 42, 28, 24, "#a05a3a");
  rect(ctx, x + 3, y + 42, 28, 5, "#c0704a");
  rect(ctx, x + 14, y + 8, 8, 36, "#3f7a4a");
  rect(ctx, x + 2, y + 18, 14, 12, "#4c8f57");
  rect(ctx, x + 20, y + 14, 13, 14, "#376b41");
  rect(ctx, x + 8, y + 2, 12, 10, "#5aa064");
}

function drawCooler(ctx: CanvasRenderingContext2D, x: number, y: number) {
  rect(ctx, x, y, 34, 64, "#d8d2c4");
  rect(ctx, x + 2, y + 2, 30, 60, "#f0ece0");
  rect(ctx, x + 8, y - 26, 18, 28, "#7fc7e8");
  rect(ctx, x + 10, y - 28, 14, 6, "#a8dff0");
  rect(ctx, x + 6, y + 22, 4, 8, "#8c2f2f");
  rect(ctx, x + 24, y + 22, 4, 8, "#2f6f6a");
  rect(ctx, x + 10, y + 44, 14, 8, "#c8c2b4");
}

const CHAIR_COLORS = ["#c0392b", "#5aa064", "#2f6fbf", "#e08a2e"];

function drawChair(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color = "#2f6fbf") {
  const u = P * s;
  rect(ctx, x - 30 * s, y - 20 * s, 60 * s, 10 * s, "#3a3d48");
  rect(ctx, x - 24 * s, y - 44 * s, 48 * s, 26 * s, color);
  rect(ctx, x - 20 * s, y - 40 * s, 40 * s, 16 * s, "#ffffff22");
  rect(ctx, x - 4 * s, y - 10 * s, 8 * s, 8 * s, "#2e2f38");
  rect(ctx, x - 26 * s, y - 4 * s, 52 * s, u, "#2e2f38");
  rect(ctx, x - 22 * s, y + 4 * s, 4 * s, 6 * s, "#2e2f38");
  rect(ctx, x + 18 * s, y + 4 * s, 4 * s, 6 * s, "#2e2f38");
}

function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, screen: string, busy: boolean) {
  const w = 132 * s;
  const top = y;
  rect(ctx, x - w / 2 + 4 * s, top + 18 * s, w - 8 * s, 4 * s, WOOD_DARK);
  for (const legX of [x - w / 2 + 8 * s, x + w / 2 - 14 * s]) {
    rect(ctx, legX, top + 18 * s, 6 * s, 34 * s, WOOD_DARK);
  }
  rect(ctx, x - w / 2, top, w, 14 * s, WOOD_LIGHT);
  rect(ctx, x - w / 2, top + 14 * s, w, 6 * s, WOOD);
  rect(ctx, x - w / 2, top, w, 3 * s, "#b57a52");

  const mw = 40 * s;
  const mh = 26 * s;
  const mx = x + 18 * s;
  const my = top - mh + 2 * s;
  rect(ctx, mx, my, mw, mh, "#1b232b");
  rect(ctx, mx + 3 * s, my + 3 * s, mw - 6 * s, mh - 9 * s, screen);
  rect(ctx, mx + mw / 2 - 3 * s, my + mh - 3 * s, 6 * s, 3 * s, "#2c3942");
  if (busy) {
    for (let i = 0; i < 3; i++) {
      rect(ctx, mx + 6 * s, my + 7 * s + i * 5 * s, (10 + ((i * 7) % 12)) * s, 2 * s, "#9ff0e2");
    }
  }

  rect(ctx, x - 54 * s, top + 4 * s, 44 * s, 5 * s, "#d8d2c4");
  rect(ctx, x - 50 * s, top + 5 * s, 36 * s, 2 * s, "#b0aa9c");
  rect(ctx, x - 58 * s, top - 4 * s, 8 * s, 8 * s, CREAM);
  rect(ctx, x - 58 * s, top - 4 * s, 8 * s, 2 * s, "#b07a3a");
}

const LOOKS: Record<string, { shirt: string; hair: string }> = {
  ninja: { shirt: "#2f3550", hair: "#1f2333" },
  idol: { shirt: "#e86aa6", hair: "#f2a6c8" },
  scientist: { shirt: "#f2f2ec", hair: "#5b3a24" },
  hero: { shirt: "#2f6fbf", hair: "#e08a2e" },
  samurai: { shirt: "#5a2f2f", hair: "#1f1a16" },
  mage: { shirt: "#6a4a9c", hair: "#cfd6e0" },
  mecha: { shirt: "#8a95a0", hair: "#2a2f3a" },
  goth: { shirt: "#2a2430", hair: "#1f1a22" }
};

const imageCache = new Map<string, HTMLImageElement>();

function getImage(src: string): HTMLImageElement | null {
  let image = imageCache.get(src);
  if (!image) {
    image = new Image();
    image.src = src;
    imageCache.set(src, image);
  }
  return image.complete && image.naturalWidth > 0 ? image : null;
}

function drawImageAvatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  src: string,
  action: Action,
  t: number
) {
  const image = getImage(src);
  const height = 58 * s;
  const bob = action === "idle" ? (Math.sin(t / 520 + x) > 0.4 ? 0 : 1.5 * s) : 0;
  const bottom = y + 10 * s - bob;
  rect(ctx, x - 24 * s, y + 16 * s, 48 * s, 5 * s, "#00000033");
  if (!image) {
    rect(ctx, x - 16 * s, bottom - height + 10 * s, 32 * s, height - 10 * s, "#c3a878");
    rect(ctx, x - 12 * s, bottom - height + 6 * s, 24 * s, 10 * s, "#8a5a3b");
    return;
  }
  const ratio = image.naturalWidth / image.naturalHeight || 1;
  const width = height * ratio;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, Math.round(x - width / 2), Math.round(bottom - height), Math.round(width), Math.round(height));
  ctx.imageSmoothingEnabled = true;
}

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  action: Action,
  color: DrawAgent["color"],
  t: number,
  child: boolean,
  look?: string,
  parts?: CharacterParts,
  seated = false
) {
  const u = P * s * 1.15;
  const bob = action === "idle" ? (Math.sin(t / 520 + x) > 0.4 ? 0 : u * 0.6) : 0;
  const walkStep = action === "walk" ? Math.sin(t / 110 + x * 0.15) : 0;
  const walkBob = action === "walk" && Math.abs(walkStep) > 0.55 ? -u * 0.9 : 0;
  const baseY = y + bob + walkBob;
  const cx = x - 6 * u;
  const palette = look ? LOOKS[look] : undefined;
  const jacket = parts?.shirt ?? palette?.shirt ?? color.jacket;
  const hair = parts?.hairColor ?? palette?.hair ?? color.hair;
  const skin = parts?.skin ?? color.skin;
  const tie = color.tie;

  if (look === "hero" || parts?.accessory === "cape") {
    rect(ctx, cx - 2 * u, baseY - 15 * u, 16 * u, 11 * u, "#b3342f");
    rect(ctx, cx + 12 * u, baseY - 13 * u, 3 * u, 8 * u, "#b3342f");
  }

  const walkSwing = !seated && action === "walk" ? walkStep * 2.2 * u : 0;
  rect(ctx, cx - 1 * u, baseY - 16 * u, 14 * u, 8 * u, INK);
  if (seated) {
    rect(ctx, cx, baseY - 10 * u, 12 * u, 7 * u, "#2a3642");
    rect(ctx, cx + 1 * u, baseY - 3 * u, 10 * u, 3 * u, "#2a3642");
  } else if (color.skirt) {
    rect(ctx, cx + 1 * u, baseY - 8 * u, 10 * u, 3 * u, "#2a2a38");
    rect(ctx, cx + 2 * u, baseY - 5 * u, 8 * u, 2 * u, "#2a2a38");
    rect(ctx, cx + 3 * u, baseY - 3 * u, 2 * u, 3 * u, skin);
    rect(ctx, cx + 7 * u, baseY - 3 * u, 2 * u, 3 * u, skin);
    rect(ctx, cx + 3 * u, baseY - u, 3 * u, u, "#1f1a16");
    rect(ctx, cx + 7 * u, baseY - u, 3 * u, u, "#1f1a16");
  } else {
    const liftL = action === "walk" && walkStep > 0.5 ? u * 0.8 : 0;
    const liftR = action === "walk" && walkStep < -0.5 ? u * 0.8 : 0;
    rect(ctx, cx + 1 * u, baseY - 6 * u, 10 * u, 8 * u, INK);
    rect(ctx, cx + 2 * u + walkSwing, baseY - 6 * u - liftL, 3 * u, 6 * u, "#2a3642");
    rect(ctx, cx + 7 * u - walkSwing, baseY - 6 * u - liftR, 3 * u, 6 * u, "#2a3642");
    rect(ctx, cx + 2 * u + walkSwing, baseY - liftL, 4 * u, u, "#1f1a16");
    rect(ctx, cx + 7 * u - walkSwing, baseY - liftR, 4 * u, u, "#1f1a16");
    rect(ctx, cx, baseY - 9 * u, 12 * u, 3 * u, "#2a3642");
  }

  rect(ctx, cx, baseY - 15 * u, 12 * u, 6 * u, jacket);
  rect(ctx, cx + 1 * u, baseY - 16 * u, 10 * u, u, jacket);
  rect(ctx, cx + 10 * u, baseY - 15 * u, 2 * u, 5 * u, "#00000022");
  rect(ctx, cx + 4 * u, baseY - 15 * u, 4 * u, 4 * u, "#f6f4ec");
  rect(ctx, cx + 5 * u, baseY - 12 * u, 2 * u, u, "#f6f4ec");
  rect(ctx, cx + 5 * u, baseY - 14 * u, 2 * u, 3 * u, tie);
  rect(ctx, cx + 5 * u, baseY - 15 * u, 2 * u, u, tie);
  rect(ctx, cx + 3 * u, baseY - 15 * u, u, 3 * u, "#00000022");
  rect(ctx, cx + 8 * u, baseY - 15 * u, u, 3 * u, "#00000022");
  rect(ctx, cx, baseY - 10 * u, 12 * u, u, "#00000033");

  const typing = action === "write" ? (Math.sin(t / 90) > 0 ? u : 0) : 0;
  const sip = seated && action === "idle" && Math.sin(t / 2600 + x) > 0.92;
  if (sip) {
    rect(ctx, cx + 12 * u, baseY - 22 * u, u, 9 * u, jacket);
    rect(ctx, cx + 12 * u, baseY - 14 * u, u, u, "#f6f4ec");
    rect(ctx, cx + 11 * u, baseY - 25 * u, 4 * u, 3 * u, CREAM);
    rect(ctx, cx + 12 * u, baseY - 26 * u, 2 * u, u, "#6b452c");
    rect(ctx, cx + 12 * u, baseY - 29 * u, u, 2 * u, "#ffffff66");
    rect(ctx, cx - u, baseY - 14 * u, u, 5 * u, jacket);
  } else if (action === "read") {
    rect(ctx, cx + 12 * u, baseY - 9 * u, u, 3 * u, jacket);
    rect(ctx, cx - u, baseY - 9 * u, u, 3 * u, jacket);
    rect(ctx, cx + 2 * u, baseY - 11 * u, 8 * u, 5 * u, "#d9cbb0");
    rect(ctx, cx + 5 * u, baseY - 11 * u, u, 5 * u, "#b9a98c");
    rect(ctx, cx + 2 * u, baseY - 11 * u, 8 * u, u, "#c9b898");
  } else if (action === "walk") {
    rect(ctx, cx + 12 * u - walkSwing, baseY - 14 * u, u, 4 * u, jacket);
    rect(ctx, cx - u + walkSwing, baseY - 14 * u, u, 4 * u, jacket);
  } else if (action === "coffee") {
    rect(ctx, cx + 12 * u, baseY - 22 * u, u, 9 * u, jacket);
    rect(ctx, cx + 12 * u, baseY - 14 * u, u, u, "#f6f4ec");
    rect(ctx, cx + 11 * u, baseY - 25 * u, 4 * u, 3 * u, CREAM);
    rect(ctx, cx + 12 * u, baseY - 26 * u, 2 * u, u, "#6b452c");
    rect(ctx, cx + 12 * u, baseY - 29 * u, u, 2 * u, "#ffffff66");
    rect(ctx, cx - u, baseY - 14 * u, u, 5 * u, jacket);
  } else {
    rect(ctx, cx + 12 * u, baseY - 14 * u, u, 5 * u + typing, jacket);
    rect(ctx, cx - u, baseY - 14 * u, u, 5 * u - typing, jacket);
    rect(ctx, cx + 12 * u, baseY - 9 * u, u, u, "#f6f4ec");
    rect(ctx, cx - u, baseY - 9 * u, u, u, "#f6f4ec");
    rect(ctx, cx + 12 * u, baseY - 8 * u, u, u, skin);
    rect(ctx, cx - u, baseY - 8 * u, u, u, skin);
    if (action === "write") {
      rect(ctx, cx + 12 * u, baseY - 10 * u - typing, u, 3 * u, GOLD);
      rect(ctx, cx + 12 * u, baseY - 7 * u - typing, u, u, INK);
    }
  }

  rect(ctx, cx + 2 * u, baseY - 23 * u, 10 * u, 8 * u, INK);
  rect(ctx, cx + 3 * u, baseY - 22 * u, 8 * u, 6 * u, skin);
  rect(ctx, cx + 3 * u, baseY - 23 * u, 8 * u, 2 * u, hair);
  rect(ctx, cx + 2 * u, baseY - 22 * u, u, 4 * u, hair);
  rect(ctx, cx + 10 * u, baseY - 22 * u, u, 4 * u, hair);
  if (Math.floor(x) % 2 === 0) {
    rect(ctx, cx + 3 * u, baseY - 22 * u, 3 * u, u, hair);
  } else {
    rect(ctx, cx + 7 * u, baseY - 22 * u, 3 * u, u, hair);
  }
  if (color.bun && !parts?.hair) {
    rect(ctx, cx + 5 * u, baseY - 26 * u, 4 * u, 3 * u, hair);
    rect(ctx, cx + 6 * u, baseY - 27 * u, 2 * u, u, hair);
  }
  if (child) {
    rect(ctx, cx + 2 * u, baseY - 18 * u, u, 2 * u, hair);
  }
  const lookDown = action === "read" || action === "write";
  const blink = Math.sin(t / 1600 + x) > 0.96;
  const eyeY = baseY - (lookDown ? 19 : 18) * u;
  rect(ctx, cx + 4 * u, eyeY - u, 2 * u, u, hair);
  rect(ctx, cx + 8 * u, eyeY - u, 2 * u, u, hair);
  rect(ctx, cx + 4 * u, eyeY, u, u, INK);
  rect(ctx, cx + 8 * u, eyeY, u, u, INK);
  if (blink) {
    rect(ctx, cx + 3 * u, eyeY, 8 * u, u, skin);
  }
  rect(ctx, cx + 6 * u, baseY - 16 * u, 2 * u, u, "#a05a3a");

  if (look === "ninja") {
    rect(ctx, cx + 2 * u, baseY - 20 * u, 10 * u, u, "#c0392b");
    rect(ctx, cx - 2 * u, baseY - 20 * u, 2 * u, 4 * u, "#c0392b");
    rect(ctx, cx + 3 * u, baseY - 17 * u, 8 * u, 2 * u, "#1f2333");
  }
  if (look === "idol") {
    rect(ctx, cx - 2 * u, baseY - 21 * u, 2 * u, 10 * u, hair);
    rect(ctx, cx + 12 * u, baseY - 21 * u, 2 * u, 10 * u, hair);
    rect(ctx, cx + 5 * u, baseY - 13 * u, 2 * u, 2 * u, GOLD);
  }
  if (look === "scientist") {
    rect(ctx, cx + 3 * u, baseY - 19 * u, 3 * u, 2 * u, "#2a2a2a");
    rect(ctx, cx + 7 * u, baseY - 19 * u, 3 * u, 2 * u, "#2a2a2a");
    rect(ctx, cx + 6 * u, baseY - 19 * u, u, u, "#2a2a2a");
    rect(ctx, cx + 2 * u, baseY - 15 * u, 2 * u, 3 * u, "#d8d8d0");
  }
  if (look === "hero") {
    rect(ctx, cx + 3 * u, baseY - 24 * u, 2 * u, u, hair);
    rect(ctx, cx + 6 * u, baseY - 25 * u, 2 * u, 2 * u, hair);
    rect(ctx, cx + 8 * u, baseY - 24 * u, 2 * u, u, hair);
  }

  if (parts?.hair === "long") {
    rect(ctx, cx - 2 * u, baseY - 22 * u, u, 10 * u, hair);
    rect(ctx, cx + 11 * u, baseY - 22 * u, u, 10 * u, hair);
  }
  if (parts?.hair === "twin") {
    rect(ctx, cx - 3 * u, baseY - 21 * u, 2 * u, 11 * u, hair);
    rect(ctx, cx + 12 * u, baseY - 21 * u, 2 * u, 11 * u, hair);
    rect(ctx, cx - 2 * u, baseY - 22 * u, u, 2 * u, hair);
    rect(ctx, cx + 12 * u, baseY - 22 * u, u, 2 * u, hair);
  }
  if (parts?.hair === "spiky") {
    rect(ctx, cx + 3 * u, baseY - 25 * u, 2 * u, u, hair);
    rect(ctx, cx + 6 * u, baseY - 26 * u, 2 * u, 2 * u, hair);
    rect(ctx, cx + 9 * u, baseY - 24 * u, 2 * u, u, hair);
  }

  if (parts?.accessory === "glasses" || (!parts && color.glasses)) {
    rect(ctx, cx + 3 * u, baseY - 19 * u, 3 * u, 2 * u, "#2a2a2a");
    rect(ctx, cx + 7 * u, baseY - 19 * u, 3 * u, 2 * u, "#2a2a2a");
    rect(ctx, cx + 6 * u, baseY - 19 * u, u, u, "#2a2a2a");
  }
  if (parts?.accessory === "headband") {
    rect(ctx, cx + 2 * u, baseY - 20 * u, 10 * u, u, "#c0392b");
    rect(ctx, cx - 2 * u, baseY - 20 * u, 2 * u, 4 * u, "#c0392b");
  }
  if (parts?.accessory === "star") {
    rect(ctx, cx + 5 * u, baseY - 13 * u, 2 * u, 2 * u, GOLD);
    rect(ctx, cx + 4 * u, baseY - 12 * u, 4 * u, u, GOLD);
  }

  if (look === "samurai") {
    rect(ctx, cx + 5 * u, baseY - 25 * u, 3 * u, 2 * u, hair);
    rect(ctx, cx + 6 * u, baseY - 26 * u, u, u, hair);
    rect(ctx, cx - 2 * u, baseY - 14 * u, 3 * u, 3 * u, "#3f2a2a");
    rect(ctx, cx + 11 * u, baseY - 14 * u, 3 * u, 3 * u, "#3f2a2a");
  }
  if (look === "mage") {
    rect(ctx, cx - u, baseY - 24 * u, 14 * u, 2 * u, "#4a2f6b");
    rect(ctx, cx + 3 * u, baseY - 28 * u, 6 * u, 4 * u, "#5a3a80");
    rect(ctx, cx + 5 * u, baseY - 30 * u, 3 * u, 2 * u, "#5a3a80");
    rect(ctx, cx + 6 * u, baseY - 29 * u, u, u, GOLD);
  }
  if (look === "mecha") {
    rect(ctx, cx + 3 * u, baseY - 19 * u, 8 * u, 2 * u, "#63d3c0");
    rect(ctx, cx + 6 * u, baseY - 26 * u, u, 3 * u, "#8a95a0");
    rect(ctx, cx + 12 * u, baseY - 15 * u, 2 * u, 3 * u, "#63707c");
  }
  if (look === "goth") {
    rect(ctx, cx + 3 * u, baseY - 16 * u, 8 * u, u, "#2a2430");
    rect(ctx, cx + 3 * u, baseY - 23 * u, u, 4 * u, "#8a4a9c");
    rect(ctx, cx + 10 * u, baseY - 22 * u, u, 3 * u, "#8a4a9c");
  }
}

function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, glyph: string, color: string) {
  const w = 26;
  const h = 22;
  rect(ctx, x - w / 2 - 2, y - h - 2, w + 4, h + 4, WOOD_DARK);
  rect(ctx, x - w / 2, y - h, w, h, CREAM);
  rect(ctx, x - 4, y, 8, 4, CREAM);
  rect(ctx, x - 2, y + 4, 4, 3, WOOD_DARK);
  ctx.fillStyle = color;
  ctx.font = "bold 15px ui-monospace, Consolas, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(glyph, x, y - h / 2 + 1);
}

function drawNameplate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  title: string,
  selected: boolean,
  accent: string,
  scale: number,
  gold: string
) {
  const font = scale < 0.9 ? 9 : 10;
  ctx.font = `bold ${font}px ui-monospace, Consolas, monospace`;
  const label = title.length > 24 ? `${title.slice(0, 23)}…` : title;
  const width = ctx.measureText(label).width + 18;
  const height = scale < 0.9 ? 16 : 18;
  rect(ctx, x - width / 2 - 2, y - height - 2, width + 4, height + 4, selected ? gold : WOOD_DARK);
  rect(ctx, x - width / 2, y - height, width, height, selected ? "#f6d477" : CREAM);
  rect(ctx, x - width / 2 + 4, y - height + 5, 5, 5, accent);
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + 3, y - height / 2 + 1);
}

function drawSelection(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, gold: string) {
  const w = 78 * s;
  const h = 58 * s;
  const top = y - 52 * s;
  ctx.strokeStyle = gold;
  ctx.lineWidth = 3;
  const corner = 14;
  const left = x - w;
  const right = x + w;
  const bottom = y + 30 * s;
  const segments: Array<[number, number, number, number]> = [
    [left, top, corner, 0],
    [left, top, 0, corner],
    [right - corner, top, corner, 0],
    [right, top, 0, corner],
    [left, bottom - 3, corner, 0],
    [left, bottom - corner, 0, corner],
    [right - corner, bottom - 3, corner, 0],
    [right, bottom - corner, 0, corner]
  ];
  for (const [sx, sy, sw, sh] of segments) {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + (sw || 0), sy + (sh || 0));
    ctx.stroke();
  }
}

function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash;
}

type Point = { x: number; y: number };

function pointAt(points: Point[], distance: number): Point {
  let remaining = distance;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (remaining <= length) {
      const t = length === 0 ? 0 : remaining / length;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    remaining -= length;
  }
  return points[points.length - 1];
}

function pathLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total;
}

function buildRoute(
  agent: DrawAgent,
  kind: "coffee" | "water" | "bathroom"
): { points: Point[]; stay: Action } {
  const points: Point[] = [{ x: agent.x, y: agent.y + 10 * agent.scale }];
  const add = (x: number, y: number) => points.push({ x, y });

  const room = agent.y < 380 ? "office" : agent.x > 958 ? "annex" : agent.y > 840 ? "office2" : "bullpen";
  if (room === "office") {
    add(215, 356);
    add(215, 390);
  } else if (room === "office2") {
    add(agent.x, 862);
    add(330, 862);
    add(330, 390);
  } else if (room === "annex") {
    if (agent.dir === -1) {
      add(agent.x + 50, agent.y);
      add(agent.x + 50, 440);
      add(990, 440);
      add(990, 525);
    } else {
      add(agent.x - 34, agent.y);
      add(agent.x - 34, 525);
    }
    add(975, 525);
    add(922, 525);
  } else {
    const aisle = agent.dir === -1 ? agent.x + 34 : agent.x;
    add(aisle, agent.y);
    add(aisle, 390);
  }

  if (kind === "coffee" || kind === "water") {
    add(865, 390);
    add(865, 330);
    add(kind === "coffee" ? 705 : 1120, 330);
    return { points, stay: "coffee" };
  }

  add(922, 795);
  add(958, 795);
  add(agent.x > 1040 ? 1068 : 1002, 795);
  return { points, stay: "idle" };
}

function breakState(
  agent: DrawAgent,
  width: number,
  height: number,
  now: number
): { x: number; y: number; action: Action } | null {
  if (typeof window !== "undefined" && window.location.search.includes("nobreaks")) return null;
  if (agent.action !== "idle") return null;
  if (agent.spawnAt && now - agent.spawnAt < 2500) return null;

  const hash = hashId(agent.id);
  const demo = typeof window !== "undefined" && window.location.search.includes("breaks=demo");
  const fast = typeof window !== "undefined" && window.location.search.includes("breaks=fast");
  const kinds: Array<"coffee" | "water" | "bathroom"> = ["coffee", "water", "bathroom"];
  const kind = demo ? "coffee" : kinds[hash % kinds.length];
  const route = buildRoute(agent, kind);
  const length = pathLength(route.points);
  const speed = 105;
  const out = Math.max(1.4, length / speed);
  const stay = kind === "bathroom" ? 3 : 4.5;
  const back = out;
  const breakTime = out + stay + back;
  const gap = fast ? 8 : 55 + (hash % 50);
  const cycle = breakTime + gap;
  const phase = demo ? out + 1 : ((now / 1000) % cycle);
  if (phase >= breakTime) return null;

  if (phase < out) {
    const position = pointAt(route.points, (phase / out) * length);
    return { x: position.x, y: position.y, action: "walk" };
  }
  if (phase < out + stay) {
    return { x: route.points[route.points.length - 1].x, y: route.points[route.points.length - 1].y, action: route.stay };
  }
  const position = pointAt(route.points, (1 - (phase - out - stay) / back) * length);
  return { x: position.x, y: position.y, action: "walk" };
}

function drawProfileSeated(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  action: Action,
  color: DrawAgent["color"],
  t: number,
  parts?: CharacterParts,
  look?: string
) {
  const k = s * 1.4;
  const jacket = parts?.shirt ?? (look ? LOOKS[look]?.shirt : undefined) ?? color.jacket;
  const hair = parts?.hairColor ?? (look ? LOOKS[look]?.hair : undefined) ?? color.hair;
  const hairStyle: HairStyle =
    parts?.hair ?? (look === "idol" ? "twin" : look === "hero" ? "spiky" : color.hairStyle);
  const skin = parts?.skin ?? color.skin;
  const tie = color.tie;
  const bob = action === "idle" ? (Math.sin(t / 650 + x) > 0.4 ? 0 : k * 0.35) : 0;
  const by = y + bob;
  const pants = color.skirt ? "#2a2a38" : "#2a3642";

  rect(ctx, x - 8 * k, by - 12 * k, 22 * k, 7 * k, pants);
  rect(ctx, x + 10 * k, by - 7 * k, 7 * k, 13 * k, pants);
  rect(ctx, x + 9 * k, by + 5 * k, 10 * k, 3 * k, "#1f1a16");

  rect(ctx, x - 17 * k, by - 40 * k, 17 * k, 31 * k, INK);
  rect(ctx, x - 15 * k, by - 38 * k, 14 * k, 27 * k, jacket);
  rect(ctx, x - 6 * k, by - 36 * k, 3 * k, 14 * k, "#00000022");
  rect(ctx, x - 4 * k, by - 36 * k, 4 * k, 16 * k, "#f6f4ec");
  rect(ctx, x - 3 * k, by - 34 * k, 2 * k, 10 * k, tie);
  rect(ctx, x - 5 * k, by - 38 * k, 6 * k, k, "#ffffff");

  rect(ctx, x - 2 * k, by - 42 * k, 5 * k, 4 * k, skin);

  const typing = action === "write" ? Math.sin(t / 90) * 2 * k : 0;
  rect(ctx, x - 4 * k, by - 34 * k, 16 * k, 5 * k, INK);
  rect(ctx, x - 3 * k, by - 33 * k, 14 * k, 3 * k, jacket);
  rect(ctx, x + 11 * k, by - 31 * k, 5 * k, 20 * k + typing, jacket);
  rect(ctx, x + 12 * k, by - 12 * k, 3 * k, 3 * k, "#f6f4ec");
  rect(ctx, x + 13 * k, by - 10 * k + typing, 4 * k, 3 * k, skin);

  rect(ctx, x - 11 * k, by - 56 * k, 19 * k, 16 * k, INK);
  rect(ctx, x - 9 * k, by - 54 * k, 15 * k, 13 * k, skin);
  rect(ctx, x + 6 * k, by - 49 * k, 2 * k, 4 * k, skin);
  rect(ctx, x - 10 * k, by - 57 * k, 17 * k, 4 * k, hair);
  rect(ctx, x - 12 * k, by - 54 * k, 3 * k, 14 * k, hair);
  rect(ctx, x - 5 * k, by - 48 * k, 2 * k, 3 * k, "#c98a6a");
  rect(ctx, x + 2 * k, by - 52 * k, 3 * k, k, hair);
  rect(ctx, x + 3 * k, by - 50 * k, 2 * k, 2 * k, INK);
  rect(ctx, x + 3 * k, by - 45 * k, 3 * k, k, "#a05a3a");

  if (parts?.accessory === "glasses" || (!parts && color.glasses)) {
    rect(ctx, x + 2 * k, by - 51 * k, 5 * k, 2 * k, "#2a2a2a");
    rect(ctx, x + 6 * k, by - 51 * k, k, k, "#2a2a2a");
  }
  if (look === "ninja") {
    rect(ctx, x - 10 * k, by - 53 * k, 15 * k, 2 * k, "#c0392b");
    rect(ctx, x - 2 * k, by - 43 * k, 11 * k, 5 * k, "#232838");
  }
  if (look === "hero") {
    rect(ctx, x - 17 * k, by - 37 * k, 6 * k, 25 * k, "#b3342f");
    rect(ctx, x - 7 * k, by - 59 * k, 3 * k, 5 * k, hair);
    rect(ctx, x - 2 * k, by - 61 * k, 3 * k, 7 * k, hair);
  }
  if (look === "samurai") {
    rect(ctx, x - 16 * k, by - 59 * k, 7 * k, 6 * k, hair);
    rect(ctx, x - 17 * k, by - 54 * k, 3 * k, 14 * k, hair);
    rect(ctx, x - 18 * k, by - 35 * k, 4 * k, 7 * k, "#5a2f2f");
  }
  if (look === "mage") {
    rect(ctx, x - 12 * k, by - 57 * k, 21 * k, 3 * k, "#4a2f6b");
    rect(ctx, x - 7 * k, by - 63 * k, 13 * k, 7 * k, "#5a3a80");
    rect(ctx, x - 3 * k, by - 67 * k, 7 * k, 5 * k, "#5a3a80");
    rect(ctx, x + k, by - 65 * k, 2 * k, 2 * k, GOLD);
  }
  if (look === "mecha") {
    rect(ctx, x - 10 * k, by - 48 * k, 18 * k, 4 * k, "#63d3c0");
    rect(ctx, x - 3 * k, by - 61 * k, 2 * k, 7 * k, "#8a95a0");
    rect(ctx, x - 4 * k, by - 63 * k, 4 * k, 3 * k, "#d0a01e");
  }
  if (look === "goth") {
    rect(ctx, x - 10 * k, by - 41 * k, 14 * k, 2 * k, "#2a2430");
    rect(ctx, x + k, by - 55 * k, 3 * k, 10 * k, "#8a4a9c");
  }
  if (hairStyle === "long") {
    rect(ctx, x - 14 * k, by - 54 * k, 3 * k, 18 * k, hair);
  }
  if (hairStyle === "twin") {
    rect(ctx, x - 14 * k, by - 52 * k, 3 * k, 15 * k, hair);
    rect(ctx, x + 6 * k, by - 53 * k, 2 * k, 7 * k, hair);
  }
  if (hairStyle === "spiky") {
    rect(ctx, x - 6 * k, by - 60 * k, 2 * k, 4 * k, hair);
    rect(ctx, x - k, by - 61 * k, 2 * k, 5 * k, hair);
    rect(ctx, x + 3 * k, by - 59 * k, 2 * k, 3 * k, hair);
  }
  if (color.bun && hairStyle === "short" && !parts?.hair) {
    rect(ctx, x - 16 * k, by - 58 * k, 6 * k, 6 * k, hair);
  }
  if (parts?.accessory === "headband") {
    rect(ctx, x - 10 * k, by - 55 * k, 14 * k, k, "#c0392b");
  }
  if (parts?.accessory === "star") {
    rect(ctx, x - 8 * k, by - 28 * k, 3 * k, 3 * k, GOLD);
  }
  if (parts?.accessory === "cape") {
    rect(ctx, x - 21 * k, by - 38 * k, 7 * k, 24 * k, "#b3342f");
  }

  if (action === "read") {
    rect(ctx, x + 1 * k, by - 25 * k, 11 * k, 8 * k, "#d9cbb0");
    rect(ctx, x + 5 * k, by - 25 * k, 3 * k, 8 * k, "#b9a98c");
  }
  if (action === "coffee") {
    rect(ctx, x + 6 * k, by - 44 * k, 4 * k, 4 * k, CREAM);
    rect(ctx, x + 7 * k, by - 45 * k, 2 * k, k, "#6b452c");
  }
}

function drawAgent(
  ctx: CanvasRenderingContext2D,
  agent: DrawAgent,
  selected: boolean,
  t: number,
  officeWidth: number,
  officeHeight: number,
  p: Palette
) {
  const s = agent.scale;
  const now = Date.now();
  if (selected) drawSelection(ctx, agent.x, agent.y, s, p.gold);

  const age = agent.spawnAt ? now - agent.spawnAt : Number.POSITIVE_INFINITY;
  if (age < 1500) {
    const progress = Math.min(1, age / 1500);
    const eased = 1 - Math.pow(1 - progress, 3);
    const doorX = officeWidth - 142;
    const doorY = 190;
    const dx = agent.x - doorX;
    const dy = agent.y + 10 - doorY;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    const total = ax + ay || 1;
    const distance = total * eased;
    let px: number;
    let py: number;
    if (distance <= ax) {
      px = doorX + dx * (ax === 0 ? 0 : distance / ax);
      py = doorY;
    } else {
      px = agent.x;
      py = doorY + dy * (ay === 0 ? 0 : (distance - ax) / ay);
    }
    rect(ctx, px - 14 * s, py + 2, 28 * s, 5 * s, "#00000033");
    if (agent.look && isImageAvatar(agent.look)) {
      drawImageAvatar(ctx, px, py, s, agent.look, "walk", t);
    } else {
      drawCharacter(ctx, px - 16 * s, py, s, "walk", agent.color, t, agent.child, agent.look, agent.parts);
    }
    drawNameplate(ctx, px, py - 70 * s, agent.name, selected, agent.color.accent, s, p.gold);
    return;
  }

  const away = breakState(agent, officeWidth, officeHeight, now);
  if (away) {
    rect(ctx, away.x - 14 * s, away.y + 2, 28 * s, 5 * s, "#00000033");
    if (agent.look && isImageAvatar(agent.look)) {
      drawImageAvatar(ctx, away.x, away.y, s, agent.look, away.action, t);
    } else {
      drawCharacter(ctx, away.x - 16 * s, away.y, s, away.action, agent.color, t, agent.child, agent.look, agent.parts);
    }
    drawNameplate(ctx, away.x, away.y - 70 * s, agent.name, selected, agent.color.accent, s, p.gold);
    return;
  }

  const mirror = agent.dir === -1;
  if (mirror) {
    ctx.save();
    ctx.translate(agent.x * 2, 0);
    ctx.scale(-1, 1);
  }
  if (agent.look && isImageAvatar(agent.look)) {
    drawImageAvatar(ctx, agent.x, agent.y + 10 * s, s, agent.look, agent.action, t);
  } else {
    drawProfileSeated(ctx, agent.x, agent.y, s, agent.action, agent.color, t, agent.parts, agent.look);
  }
  if (mirror) ctx.restore();

  const bubbleY = agent.y - 82 * s;
  if (agent.action === "permission") drawBubble(ctx, agent.x, bubbleY, "!", p.maroon);
  if (agent.action === "retry") drawBubble(ctx, agent.x, bubbleY, "…", "#8a6a1e");
  if (agent.action === "error") drawBubble(ctx, agent.x, bubbleY, "×", "#b3342f");
  if (agent.action === "bash") {
    rect(ctx, agent.x + 20 * s, agent.y - 74 * s, 52 * s, 26 * s, "#101b18");
    rect(ctx, agent.x + 20 * s, agent.y - 74 * s, 52 * s, 4 * s, WOOD_DARK);
    for (let i = 0; i < 3; i++) {
      rect(ctx, agent.x + 24 * s, agent.y - 66 * s + i * 6 * s, (16 + ((i * 9) % 20)) * s, 2 * s, "#5ee0b5");
    }
  }

  drawNameplate(ctx, agent.x, agent.y - 90 * s, agent.name, selected, agent.color.accent, s, p.gold);
  if (agent.tool) {
    ctx.font = `${s < 0.9 ? 8 : 9}px ui-monospace, Consolas, monospace`;
    ctx.fillStyle = INK;
    ctx.globalAlpha = 0.7;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(agent.tool, agent.x, agent.y + 40 * s);
    ctx.globalAlpha = 1;
  }
}

export function drawOffice(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  agents: DrawAgent[],
  labels: RoomLabel[],
  t: number,
  selectedId: string | null,
  theme: ThemeName
) {
  const p = PALETTES[theme] ?? PALETTES.fuego;
  ctx.clearRect(0, 0, width, height);
  drawRoom(ctx, width, height, t, p);
  drawFloorPlan(ctx, width, height, labels);

  const sorted = [...agents].sort((a, b) => a.y - b.y);
  for (const agent of sorted) {
    drawAgent(ctx, agent, agent.id === selectedId, t, width, height, p);
  }
  for (const deskPod of PODS) {
    drawPodTop(ctx, deskPod);
  }
}

export function drawCharacterPreview(canvas: HTMLCanvasElement, parts?: CharacterParts, look?: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const width = 84;
  const height = 100;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  drawCharacter(ctx, width / 2 + 10, height - 14, 1.1, "idle", colorFor("preview"), performance.now(), false, look, parts);
}
