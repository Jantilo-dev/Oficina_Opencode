export type SceneStatus = "idle" | "thinking" | "coding" | "running_tool" | "talking" | "error";

export type SceneAgent = {
  id: string;
  name: string;
  status: SceneStatus;
  task?: string;
  file?: string;
  logs: string[];
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

export const AREAS = [
  { id: "intranet", label: "AREA INTRANET", x: 30, y: 160, w: 360, h: 250 },
  { id: "logistica", label: "AREA LOGÍSTICA", x: 30, y: 420, w: 360, h: 230 },
  { id: "cocina", label: "COCINA", x: 30, y: 660, w: 360, h: 290 },
  { id: "soporte", label: "AREA SOPORTE", x: 440, y: 160, w: 350, h: 250 },
  { id: "portal", label: "AREA PORTAL", x: 440, y: 420, w: 350, h: 230 },
  { id: "reuniones", label: "SALA DE REUNIONES", x: 440, y: 660, w: 350, h: 290 },
  { id: "bano", label: "BAÑO · 12", x: 840, y: 160, w: 410, h: 455 },
  { id: "pasillo", label: "PASILLO", x: 840, y: 625, w: 410, h: 325 }
] as const;

export const CUBICLES: Cubicle[] = [
  { x: 50, y: 232, w: 160, h: 168, seatX: 108, seatY: 356 },
  { x: 215, y: 232, w: 160, h: 168, seatX: 273, seatY: 356 },
  { x: 50, y: 462, w: 160, h: 168, seatX: 108, seatY: 586 },
  { x: 215, y: 462, w: 160, h: 168, seatX: 273, seatY: 586 },
  { x: 455, y: 232, w: 160, h: 168, seatX: 513, seatY: 356 },
  { x: 615, y: 232, w: 160, h: 168, seatX: 673, seatY: 356 },
  { x: 455, y: 462, w: 160, h: 168, seatX: 513, seatY: 586 },
  { x: 615, y: 462, w: 160, h: 168, seatX: 673, seatY: 586 }
];

export const CAFE_SPOTS = [
  { x: 130, y: 900 },
  { x: 210, y: 900 },
  { x: 290, y: 900 },
  { x: 160, y: 840 }
];

export const HALL_SPOTS = [
  { x: 500, y: 920 },
  { x: 570, y: 920 },
  { x: 640, y: 920 },
  { x: 710, y: 920 },
  { x: 930, y: 880 },
  { x: 1010, y: 880 }
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
    skin: SKINS[(hash >> 3) % SKINS.length],
    pants: ["#2f3a4d", "#3c3f4a", "#4a3b2f", "#2b3b34"][hash % 4]
  };
}

type Ctx = CanvasRenderingContext2D;

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

const INK = "#1a2430";
const WALL = "#c9cfd8";
const WALL_DARK = "#a8b0bb";
const WALL_LINE = "#b7bec8";
const BASE = "#6f7884";
const FLOOR = "#4a86d8";
const FLOOR_HI = "#5b97e6";
const FLOOR_LO = "#2f5f9f";
const WOOD = "#d9a86c";
const WOOD_DARK = "#b9854f";
const WOOD_EDGE = "#8a5a3b";
const PANEL = "#b9c0c9";
const PANEL_DARK = "#6b7480";
const PANEL_TRIM = "#7fb2e8";

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

function drawCorridors(ctx: Ctx) {
  for (const [x1, x2] of [
    [390, 440],
    [790, 840]
  ]) {
    rect(ctx, x1, 150, x2 - x1, 800, "#e6e9ee");
    for (let y = 150; y < 950; y += 32) {
      rect(ctx, x1, y, x2 - x1, 1, "#cfd5dd");
    }
    rect(ctx, x1, 150, 2, 800, "#c3cad4");
    rect(ctx, x2 - 2, 150, 2, 800, "#c3cad4");
  }
}

function drawRooms(ctx: Ctx) {
  drawWall(ctx, 18, 150, 12, 800);
  drawWall(ctx, 1250, 150, 12, 800);
  drawWall(ctx, 18, 950, 1244, 12);

  const gaps: Array<[number, number]> = [
    [320, 352],
    [552, 584],
    [800, 832]
  ];
  vWall(ctx, 382, 150, 950, gaps);
  vWall(ctx, 440, 150, 950, gaps);
  vWall(ctx, 790, 150, 950, gaps);
  vWall(ctx, 840, 150, 950, [
    [320, 352],
    [750, 782]
  ]);

  hWall(ctx, 410, 30, 382, [[160, 192]]);
  hWall(ctx, 410, 448, 790, [[560, 592]]);
  hWall(ctx, 655, 30, 382, [[160, 192]]);
  hWall(ctx, 655, 448, 790, [[560, 592]]);
  hWall(ctx, 615, 848, 1250, [[1000, 1032]]);

  for (const [, to] of gaps) {
    rect(ctx, 384, to - 26, 6, 22, "#a07a52");
    rect(ctx, 442, to - 26, 6, 22, "#a07a52");
    rect(ctx, 792, to - 26, 6, 22, "#a07a52");
  }
  rect(ctx, 842, 326, 6, 22, "#a07a52");
  rect(ctx, 842, 756, 6, 22, "#a07a52");
  rect(ctx, 1004, 617, 24, 6, "#a07a52");
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
  rect(ctx, 448, 668, 334, 274, "#e9edf2");
  rect(ctx, 470, 680, 150, 44, "#f4f6f8");
  rect(ctx, 474, 684, 142, 36, "#dfe8f0");
  rect(ctx, 482, 694, 60, 3, "#5a8fd0");
  rect(ctx, 482, 702, 90, 3, "#8fa8c0");

  rect(ctx, 486, 770, 250, 84, WOOD_DARK);
  rect(ctx, 490, 774, 242, 76, WOOD);
  rect(ctx, 490, 774, 242, 4, "#ecc48c");
  for (let i = 0; i < 3; i++) {
    rect(ctx, 506 + i * 70, 748, 26, 16, "#3b4657");
    rect(ctx, 506 + i * 70, 860, 26, 16, "#3b4657");
  }
  rect(ctx, 462, 800, 16, 26, "#3b4657");
  rect(ctx, 744, 800, 16, 26, "#3b4657");
  drawPlant(ctx, 730, 680);
}

function drawBathroom(ctx: Ctx) {
  rect(ctx, 848, 168, 394, 439, "#e3e7ec");
  for (let y = 168; y < 607; y += 24) {
    rect(ctx, 848, y, 394, 1, "#cfd5dd");
  }
  for (let x = 848; x < 1242; x += 24) {
    rect(ctx, x, 168, 1, 439, "#cfd5dd");
  }

  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 6; i++) {
      const sx = 858 + i * 63;
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

  rect(ctx, 930, 350, 220, 12, "#c9cfd8");
  for (let i = 0; i < 6; i++) {
    rect(ctx, 940 + i * 35, 344, 20, 14, "#f4f6f8");
    rect(ctx, 940 + i * 35, 330, 20, 10, "#a8d6e8");
  }
  drawPlant(ctx, 1190, 540);
}

function drawPasillo(ctx: Ctx) {
  rect(ctx, 848, 633, 394, 310, "#e6e9ee");
  for (let y = 633; y < 943; y += 32) {
    rect(ctx, 848, y, 394, 1, "#cfd5dd");
  }
  rect(ctx, 880, 700, 130, 44, "#2f5f95");
  rect(ctx, 884, 704, 122, 16, "#3f6fad");
  rect(ctx, 884, 722, 122, 18, "#4f7fbd");
  rect(ctx, 1020, 760, 70, 26, WOOD_DARK);
  rect(ctx, 1023, 763, 64, 20, WOOD);
  drawPlant(ctx, 1180, 680);
  drawPlant(ctx, 870, 860);
  rect(ctx, 1060, 840, 80, 34, "#2f5f95");
  rect(ctx, 1064, 844, 72, 12, "#3f6fad");
}

function drawCubicle(ctx: Ctx, cubicle: Cubicle, index: number, screenOn: boolean, t: number) {
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

  drawLaptop(ctx, x + 22, deskTop, screenOn, t);
  drawSideMonitor(ctx, x + w - 54, deskTop, screenOn, t);

  rect(ctx, x + 54, deskTop + 3, 32, 6, "#3a414d");
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 10; col++) {
      rect(ctx, x + 55 + col * 3, deskTop + 4 + row * 2, 2, 1, "#8a94a2");
    }
  }
  if (screenOn) {
    const key = Math.floor((t / 140 + index * 3) % 10);
    rect(ctx, x + 55 + key * 3, deskTop + 4, 2, 1, "#f2d24a");
  }
  const mouseX = x + 96 + (screenOn ? Math.sin(t / 220 + index) * 2 : 0);
  ctx.fillStyle = "#3a414d";
  ctx.beginPath();
  ctx.ellipse(mouseX, deskTop + 7, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  if (screenOn) rect(ctx, mouseX - 1, deskTop + 5, 2, 1, "#8fd0f0");

  const chair = ["#c0392b", "#3f8f57", "#2f5f95", "#d08a2e"][index % 4];
  rect(ctx, x + 30, deskTop - 36, 10, 36, chair);
  rect(ctx, x + 30, deskTop - 36, 10, 3, "#ffffff33");
  rect(ctx, x + 37, deskTop - 33, 3, 30, "#00000022");
  rect(ctx, x + 28, deskTop - 2, 36, 7, "#3a414d");
  rect(ctx, x + 28, deskTop - 2, 36, 2, "#586270");
  rect(ctx, x + 30, deskTop + 5, 5, 13, "#2b323c");
  rect(ctx, x + 56, deskTop + 5, 5, 13, "#2b323c");
}

function drawLaptop(ctx: Ctx, x: number, deskTop: number, screenOn: boolean, t: number) {
  rect(ctx, x, deskTop + 2, 26, 7, "#343c48");
  rect(ctx, x + 2, deskTop + 3, 22, 2, "#4a5462");
  for (let i = 0; i < 4; i++) {
    rect(ctx, x + 3 + i * 5, deskTop + 6, 3, 1, screenOn && i === Math.floor(t / 200) % 4 ? "#f2d24a" : "#8f97a3");
  }
  rect(ctx, x + 2, deskTop - 14, 22, 14, "#b9c0ca");
  rect(ctx, x + 2, deskTop - 14, 22, 2, "#e4e8ee");
  rect(ctx, x + 18, deskTop - 12, 2, 10, "#8f98a3");
  rect(ctx, x + 2, deskTop - 12, 3, 10, screenOn ? "#7fd0e8" : "#39424e");
  if (screenOn) {
    rect(ctx, x + 2, deskTop - 4, 3, 2, "#c9f0fa");
    rect(ctx, x, deskTop + 10, 24, 2, "#7fd0e833");
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
  rect(ctx, x + 2, top + 2, w - 4, h - 4, "#333d4a");
  for (let i = 0; i < 4; i++) {
    rect(ctx, x + 7, top + 7 + i * 4, w - 14, 2, "#2a3340");
  }
  rect(ctx, x, top + 2, 4, h - 4, screenOn ? "#7fd0e8" : "#39424e");
  if (screenOn) {
    rect(ctx, x, top + 4, 2, h - 8, "#c9f0fa");
    const pulse = 0.5 + Math.sin(t / 500) * 0.5;
    ctx.fillStyle = `rgba(127, 208, 232, ${0.12 + pulse * 0.12})`;
    ctx.fillRect(x - 4, top + 2, 8, h - 4);
    rect(ctx, x + 2, deskTop + 3, w - 8, 2, "#7fd0e8aa");
  }
  rect(ctx, x, top, w, 2, "#4a5666");
  rect(ctx, x + w - 2, top, 2, h, "#161c24");
  rect(ctx, x + w - 8, top + h - 7, 3, 3, screenOn ? "#63e6a8" : "#5a2a2a");
}

function drawChibiSeated(ctx: Ctx, agent: AgentView, t: number) {
  const { x, y, colors, status } = agent;
  const bob = status === "thinking" ? Math.sin(t / 400 + x) * 1.2 : 0;
  const baseY = y + bob;
  rect(ctx, x - 6, baseY - 2, 28, 4, "#00000022");
  rect(ctx, x - 4, baseY - 24, 16, 20, INK);
  rect(ctx, x - 2, baseY - 22, 12, 16, colors.shirt);
  rect(ctx, x + 2, baseY - 22, 4, 12, "#f4f6f8");
  rect(ctx, x + 3, baseY - 20, 2, 8, colors.shirtDark);
  const typing = status === "coding" ? Math.sin(t / 80 + x) * 2 : 0;
  const mouseMove = status === "coding" ? Math.sin(t / 160 + x) * 1.6 : 0;
  rect(ctx, x + 8, baseY - 18, 9, 4, colors.shirt);
  rect(ctx, x + 15, baseY - 15, 4, 9, colors.shirtDark);
  rect(ctx, x + 13, baseY - 7, 5, 3, colors.shirt);
  rect(ctx, x + 12, baseY - 2 + typing * 0.35, 5, 4, colors.skin);

  rect(ctx, x + 7, baseY - 14, 12, 3, colors.shirtDark);
  rect(ctx, x + 17, baseY - 12, 4, 7, colors.shirt);
  rect(ctx, x + 20, baseY - 6, 13, 3, colors.shirtDark);
  rect(ctx, x + 31 + mouseMove, baseY - 2, 5, 4, colors.skin);

  if (status === "thinking") {
    rect(ctx, x + 6, baseY - 30, 3, 9, colors.shirt);
    rect(ctx, x + 9, baseY - 33, 4, 4, colors.skin);
  }

  rect(ctx, x - 8, baseY - 42, 24, 20, INK);
  rect(ctx, x - 6, baseY - 40, 20, 17, colors.skin);
  rect(ctx, x - 7, baseY - 44, 22, 5, colors.hair);
  rect(ctx, x - 9, baseY - 40, 4, 12, colors.hair);
  rect(ctx, x + 12, baseY - 35, 3, 4, colors.skin);
  rect(ctx, x + 1, baseY - 38, 3, 2, INK);
  rect(ctx, x + 6, baseY - 38, 3, 2, INK);
  rect(ctx, x + 3, baseY - 31, 6, 2, "#a35a44");
  rect(ctx, x + 8, baseY - 22, 2, 16, "#00000022");
  rect(ctx, x + 8, baseY - 40, 4, 17, "#00000012");
  if (status === "error") {
    rect(ctx, x - 8, baseY - 44, 24, 20, "#b3342f33");
  }
}

function drawChibiStanding(ctx: Ctx, agent: AgentView, t: number, walking: boolean) {
  const { x, y, colors } = agent;
  const step = walking ? Math.sin(t / 110 + x) : 0;
  rect(ctx, x - 14, y + 4, 30, 6, "#00000033");
  rect(ctx, x - 6, y - 14 + step, 5, 16, colors.pants);
  rect(ctx, x + 4, y - 14 - step, 5, 16, colors.pants);
  rect(ctx, x - 9, y - 32, 20, 18, INK);
  rect(ctx, x - 7, y - 30, 16, 15, colors.shirt);
  rect(ctx, x - 2, y - 30, 5, 11, "#f4f6f8");
  rect(ctx, x - 12, y - 28 + step * 0.6, 4, 12, colors.shirt);
  rect(ctx, x + 10, y - 28 - step * 0.6, 4, 12, colors.shirt);
  rect(ctx, x - 12, y - 44, 24, 20, INK);
  rect(ctx, x - 10, y - 42, 20, 17, colors.skin);
  rect(ctx, x - 11, y - 46, 22, 5, colors.hair);
  rect(ctx, x - 13, y - 42, 4, 12, colors.hair);
  rect(ctx, x - 4, y - 40, 3, 2, INK);
  rect(ctx, x + 3, y - 40, 3, 2, INK);
  rect(ctx, x - 1, y - 33, 6, 2, "#a35a44");
  rect(ctx, x + 7, y - 30, 2, 15, "#00000022");
  rect(ctx, x + 7, y - 42, 4, 17, "#00000012");
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

export function drawScene(
  ctx: Ctx,
  width: number,
  height: number,
  agents: AgentView[],
  t: number,
  selectedId: string | null,
  screenStates: boolean[] = []
) {
  ctx.imageSmoothingEnabled = false;
  drawFloor(ctx, width, height);
  drawCorridors(ctx);
  drawTopWall(ctx, width);
  rect(ctx, 0, 140, width, 10, "#1a335822");
  drawCafe(ctx);
  drawMeeting(ctx);
  drawBathroom(ctx);
  drawPasillo(ctx);
  drawRooms(ctx);
  for (const area of AREAS) {
    drawAreaLabel(ctx, area.x + area.w / 2, area.y + 22, area.label);
  }
  for (let i = 0; i < CUBICLES.length; i++) {
    drawCubicle(ctx, CUBICLES[i], i, screenStates[i] ?? false, t);
  }

  const sorted = [...agents].sort((a, b) => a.y - b.y);
  for (const agent of sorted) {
    if (agent.seated) drawChibiSeated(ctx, agent, t);
    else drawChibiStanding(ctx, agent, t, agent.walking);
    if (agent.status !== "talking") drawBubble(ctx, agent, t);
    drawNameplate(ctx, agent, agent.id === selectedId);
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
