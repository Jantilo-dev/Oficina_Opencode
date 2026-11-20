import { useEffect, useMemo, useRef, useState } from "react";
import type { ThemeName } from "../office/sprites";
import { drawIsoAgent, type IsoAgent } from "./isoAvatar";
import { TILE_H, TILE_W, WALL_H, fill, path, project, shade } from "./projection";

const ROOM_W = 15;
const ROOM_H = 9;
const STATIONS = [
  { x: 4.0, y: 2.2 },
  { x: 7.5, y: 2.2 },
  { x: 11.0, y: 2.2 },
  { x: 5.75, y: 5.35 },
  { x: 9.25, y: 5.35 }
];
const DESK_W = 2.35;
const DESK_D = 1.2;
const DESK_Z = 22;
const SEAT_Z = 18;
const CAT_DY = 0.78;
const CHAIR_DY = 1.3;
const MONITOR_DY = -0.3;

type Props = {
  agents: IsoAgent[];
  groupName: string;
  theme: ThemeName;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function point(x: number, y: number, z = 0) {
  return project(x, y, z);
}

function boxTop(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, z: number, color: string) {
  fill(ctx, [point(x1, y1, z), point(x2, y1, z), point(x2, y2, z), point(x1, y2, z)], color);
}

function boxFront(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, z1: number, z2: number, color: string) {
  fill(ctx, [point(x1, y, z2), point(x2, y, z2), point(x2, y, z1), point(x1, y, z1)], color);
}

function boxSide(ctx: CanvasRenderingContext2D, y1: number, y2: number, x: number, z1: number, z2: number, color: string) {
  fill(ctx, [point(x, y1, z2), point(x, y2, z2), point(x, y2, z1), point(x, y1, z1)], color);
}

function drawFloor(ctx: CanvasRenderingContext2D) {
  fill(ctx, [point(0, 0), point(ROOM_W, 0), point(ROOM_W, ROOM_H), point(0, ROOM_H)], "#dcdad2");
  for (let y = 0; y < ROOM_H; y++) {
    for (let x = 0; x < ROOM_W; x++) {
      const color = (x + y) % 2 === 0 ? "#ecebe5" : "#e3e1d9";
      fill(ctx, [point(x, y), point(x + 1, y), point(x + 1, y + 1), point(x, y + 1)], color);
      path(ctx, [point(x, y), point(x + 1, y), point(x + 1, y + 1), point(x, y + 1)]);
      ctx.strokeStyle = "#c9c7bf";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  fill(ctx, [point(4.4, 5.2), point(9.6, 5.2), point(9.6, 7.7), point(4.4, 7.7)], "#c5d4dc");
  path(ctx, [point(4.55, 5.35), point(9.45, 5.35), point(9.45, 7.55), point(4.55, 7.55)]);
  ctx.strokeStyle = "#aebfc9";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawWalls(ctx: CanvasRenderingContext2D) {
  fill(ctx, [point(0, 0, WALL_H), point(ROOM_W, 0, WALL_H), point(ROOM_W, 0, 0), point(0, 0, 0)], "#eee8d8");
  fill(ctx, [point(0, 0, WALL_H), point(0, ROOM_H, WALL_H), point(0, ROOM_H, 0), point(0, 0, 0)], "#e4ddcd");
  fill(ctx, [point(0, 0, WALL_H), point(ROOM_W, 0, WALL_H), point(ROOM_W, 0, WALL_H - 7), point(0, 0, WALL_H - 7)], "#f7f1e2");
  fill(ctx, [point(0, 0, WALL_H), point(0, ROOM_H, WALL_H), point(0, ROOM_H, WALL_H - 7), point(0, 0, WALL_H - 7)], "#f0e8d8");
  fill(ctx, [point(0, 0, 10), point(ROOM_W, 0, 10), point(ROOM_W, 0, 0), point(0, 0, 0)], "#d3cbb9");
  fill(ctx, [point(0, 0, 10), point(0, ROOM_H, 10), point(0, ROOM_H, 0), point(0, 0, 0)], "#c8c0ae");

  fill(ctx, [point(3.1, 0, 96), point(8.2, 0, 96), point(8.2, 0, 50), point(3.1, 0, 50)], "#b8dbe8");
  fill(ctx, [point(3.35, 0, 92), point(7.95, 0, 92), point(7.95, 0, 54), point(3.35, 0, 54)], "#9fd1e1");
  fill(ctx, [point(3.35, 0, 86), point(7.95, 0, 86), point(7.95, 0, 84), point(3.35, 0, 84)], "#f1dda5");
  for (let i = 0; i < 6; i++) {
    fill(
      ctx,
      [point(3.35 + i * 0.76, 0, 92), point(3.6 + i * 0.76, 0, 92), point(3.6 + i * 0.76, 0, 55), point(3.35 + i * 0.76, 0, 55)],
      "#d8edf3"
    );
  }
  path(ctx, [point(3.1, 0, 96), point(8.2, 0, 96), point(8.2, 0, 50), point(3.1, 0, 50)]);
  ctx.strokeStyle = "#7e9ba7";
  ctx.lineWidth = 2;
  ctx.stroke();

  fill(ctx, [point(9.4, 0, 88), point(13.8, 0, 88), point(13.8, 0, 55), point(9.4, 0, 55)], "#2f3e52");
  fill(ctx, [point(9.55, 0, 85), point(13.65, 0, 85), point(13.65, 0, 58), point(9.55, 0, 58)], "#3d5068");
  fill(ctx, [point(9.9, 0, 74), point(10.3, 0, 74), point(10.3, 0, 68), point(9.9, 0, 68)], "#e0a92e");
}

function drawWindowArt(ctx: CanvasRenderingContext2D) {
  fill(ctx, [point(0.05, 2.1, 88), point(0.05, 4.8, 88), point(0.05, 4.8, 52), point(0.05, 2.1, 52)], "#e8a14a");
  fill(ctx, [point(0.05, 2.3, 84), point(0.05, 4.6, 84), point(0.05, 4.6, 56), point(0.05, 2.3, 56)], "#f7d18c");
  fill(ctx, [point(0.05, 2.5, 80), point(0.05, 4.4, 80), point(0.05, 4.4, 60), point(0.05, 2.5, 60)], "#9fc7da");
  fill(ctx, [point(0.05, 2.6, 72), point(0.05, 3.1, 72), point(0.05, 3.1, 62), point(0.05, 2.6, 62)], "#f4f6f8");
  fill(ctx, [point(0.05, 3.5, 72), point(0.05, 4.1, 72), point(0.05, 4.1, 62), point(0.05, 3.5, 62)], "#f4f6f8");

  fill(ctx, [point(0.05, 6.2, 92), point(0.05, 8.1, 92), point(0.05, 8.1, 67), point(0.05, 6.2, 67)], "#b68a58");
  fill(ctx, [point(0.05, 6.35, 88), point(0.05, 7.95, 88), point(0.05, 7.95, 71), point(0.05, 6.35, 71)], "#e7d3a8");
  fill(ctx, [point(0.05, 6.55, 84), point(0.05, 7.25, 84), point(0.05, 7.25, 80), point(0.05, 6.55, 80)], "#f4d34a");
  fill(ctx, [point(0.05, 7.35, 84), point(0.05, 7.8, 84), point(0.05, 7.8, 80), point(0.05, 7.35, 80)], "#d57b74");
  fill(ctx, [point(0.05, 6.55, 78), point(0.05, 7.1, 78), point(0.05, 7.1, 74), point(0.05, 6.55, 74)], "#7fb2e8");
  fill(ctx, [point(0.05, 7.25, 78), point(0.05, 7.8, 78), point(0.05, 7.8, 74), point(0.05, 7.25, 74)], "#7fd0a0");
}

function drawWindowLight(ctx: CanvasRenderingContext2D) {
  fill(ctx, [point(3.1, 0.1), point(8.2, 0.1), point(10.3, 4.7), point(5.2, 4.7)], "#fff4c92c");
  for (let i = 0; i < 6; i++) {
    fill(
      ctx,
      [point(3.6 + i * 0.78, 0.1), point(4.0 + i * 0.78, 0.1), point(6.0 + i * 0.78, 4.6), point(5.6 + i * 0.78, 4.6)],
      "#fff8dc20"
    );
  }
}

function drawShadows(ctx: CanvasRenderingContext2D) {
  for (const station of STATIONS) {
    const x1 = station.x - DESK_W / 2 + 0.2;
    const x2 = station.x + DESK_W / 2 + 0.2;
    const y1 = station.y - DESK_D / 2 + 0.35;
    const y2 = station.y + DESK_D / 2 + 0.5;
    fill(ctx, [point(x1, y1), point(x2, y1), point(x2, y2), point(x1, y2)], "#20293630");
    fill(
      ctx,
      [
        point(station.x - 0.4, station.y + CAT_DY - 0.25),
        point(station.x + 0.4, station.y + CAT_DY - 0.25),
        point(station.x + 0.4, station.y + CAT_DY + 0.3),
        point(station.x - 0.4, station.y + CAT_DY + 0.3)
      ],
      "#20293624"
    );
  }
  fill(ctx, [point(12.55, 5.35), point(14.2, 5.35), point(14.2, 6.8), point(12.55, 6.8)], "#20293636");
}

function drawWallClock(ctx: CanvasRenderingContext2D) {
  fill(ctx, [point(1.35, 0, 96), point(2.15, 0, 96), point(2.15, 0, 75), point(1.35, 0, 75)], "#d5b06a");
  fill(ctx, [point(1.45, 0, 93), point(2.05, 0, 93), point(2.05, 0, 78), point(1.45, 0, 78)], "#f8f4e8");
  fill(ctx, [point(1.73, 0, 90), point(1.77, 0, 90), point(1.77, 0, 83), point(1.73, 0, 83)], "#3d5068");
  fill(ctx, [point(1.73, 0, 86), point(1.94, 0, 86), point(1.94, 0, 83), point(1.73, 0, 83)], "#3d5068");
}

function drawPapers(ctx: CanvasRenderingContext2D, x: number, y: number) {
  fill(ctx, [point(x - 0.3, y - 0.18), point(x + 0.22, y - 0.18), point(x + 0.22, y + 0.18), point(x - 0.3, y + 0.18)], "#f5f1e5");
  fill(ctx, [point(x - 0.2, y - 0.08), point(x + 0.1, y - 0.08), point(x + 0.1, y - 0.05), point(x - 0.2, y - 0.05)], "#c5bca8");
  fill(ctx, [point(x - 0.2, y + 0.01), point(x + 0.04, y + 0.01), point(x + 0.04, y + 0.04), point(x - 0.2, y + 0.04)], "#d7cdb8");
}

function drawMug(ctx: CanvasRenderingContext2D, x: number, y: number) {
  fill(ctx, [point(x - 0.09, y - 0.08, 31), point(x + 0.09, y - 0.08, 31), point(x + 0.09, y + 0.08, 31), point(x - 0.09, y + 0.08, 31)], "#f2f0e8");
  fill(ctx, [point(x - 0.07, y - 0.06, 31), point(x + 0.07, y - 0.06, 31), point(x + 0.07, y + 0.06, 23), point(x - 0.07, y + 0.06, 23)], "#f4f6f8");
  fill(ctx, [point(x + 0.08, y - 0.02, 28), point(x + 0.14, y - 0.02, 28), point(x + 0.14, y + 0.05, 28), point(x + 0.08, y + 0.05, 28)], "#d8d4ca");
}

function drawTrash(ctx: CanvasRenderingContext2D, x: number, y: number) {
  fill(ctx, [point(x - 0.22, y - 0.2, 17), point(x + 0.22, y - 0.2, 17), point(x + 0.22, y + 0.2, 17), point(x - 0.22, y + 0.2, 17)], "#777f88");
  fill(ctx, [point(x - 0.18, y - 0.16, 17), point(x + 0.18, y - 0.16, 17), point(x + 0.18, y + 0.16, 0), point(x - 0.18, y + 0.16, 0)], "#59616a");
}

function drawVignette(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.2, width / 2, height / 2, Math.max(width, height) * 0.72);
  gradient.addColorStop(0, "#00000000");
  gradient.addColorStop(1, "#1f22331c");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawChair(ctx: CanvasRenderingContext2D, x: number, y: number, accent: string) {
  const base = point(x, y + 0.35, 0);
  ctx.strokeStyle = "#313747";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  for (const [dx, dy] of [
    [0.38, 0],
    [-0.38, 0],
    [0, 0.32],
    [0, -0.32],
    [0.25, 0.23]
  ]) {
    const wheel = point(x + dx, y + 0.35 + dy, 0);
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(wheel.x, wheel.y);
    ctx.stroke();
    ctx.fillStyle = "#171b24";
    ctx.beginPath();
    ctx.ellipse(wheel.x, wheel.y - 1, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  fill(ctx, [point(x - 0.08, y + 0.18, 17), point(x + 0.08, y + 0.18, 17), point(x + 0.08, y + 0.18, 1), point(x - 0.08, y + 0.18, 1)], "#4a5265");

  boxTop(ctx, x - 0.4, y - 0.2, x + 0.4, y + 0.28, 18, shade(accent, 0.9));
  boxFront(ctx, x - 0.4, x + 0.4, y + 0.28, 8, 18, shade(accent, 0.55));
  boxSide(ctx, y - 0.2, y + 0.28, x + 0.4, 8, 18, shade(accent, 0.42));
  fill(ctx, [point(x - 0.34, y - 0.13, 19), point(x + 0.34, y - 0.13, 19), point(x + 0.34, y + 0.2, 19), point(x - 0.34, y + 0.2, 19)], shade(accent, 1.2));

  fill(
    ctx,
    [
      point(x - 0.38, y - 0.34, 18),
      point(x + 0.38, y - 0.34, 18),
      point(x + 0.38, y - 0.34, 46),
      point(x - 0.38, y - 0.34, 46)
    ],
    "#202532"
  );
  fill(
    ctx,
    [
      point(x - 0.42, y - 0.42, 18),
      point(x - 0.3, y - 0.42, 18),
      point(x - 0.3, y - 0.42, 44),
      point(x - 0.42, y - 0.42, 44)
    ],
    accent
  );
  fill(
    ctx,
    [
      point(x + 0.3, y - 0.42, 18),
      point(x + 0.42, y - 0.42, 18),
      point(x + 0.42, y - 0.42, 44),
      point(x + 0.3, y - 0.42, 44)
    ],
    accent
  );
  fill(
    ctx,
    [
      point(x - 0.3, y - 0.42, 46),
      point(x + 0.3, y - 0.42, 46),
      point(x + 0.3, y - 0.42, 43),
      point(x - 0.3, y - 0.42, 43)
    ],
    "#2c3343"
  );
  boxTop(ctx, x - 0.48, y - 0.28, x - 0.35, y + 0.22, 26, "#3e465a");
  boxTop(ctx, x + 0.35, y - 0.28, x + 0.48, y + 0.22, 26, "#3e465a");
  fill(ctx, [point(x - 0.48, y - 0.28, 26), point(x - 0.35, y - 0.28, 26), point(x - 0.35, y - 0.38, 22), point(x - 0.48, y - 0.38, 22)], "#252b38");
  fill(ctx, [point(x + 0.35, y - 0.28, 26), point(x + 0.48, y - 0.28, 26), point(x + 0.48, y - 0.38, 22), point(x + 0.35, y - 0.38, 22)], "#252b38");
}

function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number, theme: ThemeName) {
  const x1 = x - DESK_W / 2;
  const x2 = x + DESK_W / 2;
  const y1 = y - DESK_D / 2;
  const y2 = y + DESK_D / 2;
  boxTop(ctx, x1, y1, x2, y2, DESK_Z, theme === "esmeralda" ? "#d6b77a" : "#e6bd79");
  boxFront(ctx, x1, x2, y2, DESK_Z - 18, DESK_Z, "#a95d54");
  boxSide(ctx, y1, y2, x2, DESK_Z - 18, DESK_Z, "#8f4b48");
  boxFront(ctx, x1, x2, y2, 0, DESK_Z - 18, "#b9685c");
  fill(ctx, [point(x1, y2, 21), point(x2, y2, 21), point(x2, y2, 18), point(x1, y2, 18)], "#e8a96f");
  fill(ctx, [point(x1, y1, DESK_Z - 2), point(x2, y1, DESK_Z - 2), point(x2, y1, DESK_Z - 18), point(x1, y1, DESK_Z - 18)], "#7f4541");
  for (const leg of [x1 + 0.2, x2 - 0.2]) {
    fill(ctx, [point(leg, y2, 18), point(leg + 0.16, y2, 18), point(leg + 0.16, y2, 0), point(leg, y2, 0)], "#8b4e3b");
  }
}

function drawLaptop(ctx: CanvasRenderingContext2D, x: number, y: number) {
  boxTop(ctx, x - 0.2, y - 0.14, x + 0.2, y + 0.14, DESK_Z + 1, "#333a47");
  fill(ctx, [point(x - 0.06, y - 0.1, DESK_Z + 13), point(x + 0.06, y - 0.1, DESK_Z + 13), point(x + 0.06, y - 0.1, DESK_Z + 1), point(x - 0.06, y - 0.1, DESK_Z + 1)], "#343c49");
  fill(
    ctx,
    [
      point(x - 0.34, y + 0.12, DESK_Z + 31),
      point(x + 0.34, y + 0.12, DESK_Z + 31),
      point(x + 0.34, y + 0.12, DESK_Z + 6),
      point(x - 0.34, y + 0.12, DESK_Z + 6)
    ],
    "#202631"
  );
  fill(
    ctx,
    [
      point(x - 0.32, y + 0.1, DESK_Z + 29),
      point(x + 0.32, y + 0.1, DESK_Z + 29),
      point(x + 0.32, y + 0.1, DESK_Z + 8),
      point(x - 0.32, y + 0.1, DESK_Z + 8)
    ],
    "#2b3442"
  );
  fill(
    ctx,
    [
      point(x - 0.26, y + 0.09, DESK_Z + 27),
      point(x + 0.26, y + 0.09, DESK_Z + 27),
      point(x + 0.26, y + 0.09, DESK_Z + 10),
      point(x - 0.26, y + 0.09, DESK_Z + 10)
    ],
    "#7fb2d2"
  );
  fill(
    ctx,
    [
      point(x - 0.22, y + 0.08, DESK_Z + 24),
      point(x + 0.04, y + 0.08, DESK_Z + 24),
      point(x + 0.04, y + 0.08, DESK_Z + 22),
      point(x - 0.22, y + 0.08, DESK_Z + 22)
    ],
    "#d4edf5"
  );
  fill(
    ctx,
    [
      point(x - 0.22, y + 0.08, DESK_Z + 20),
      point(x + 0.16, y + 0.08, DESK_Z + 20),
      point(x + 0.16, y + 0.08, DESK_Z + 18),
      point(x - 0.22, y + 0.08, DESK_Z + 18)
    ],
    "#5d99b8"
  );
  fill(
    ctx,
    [
      point(x - 0.38, y - 0.32, DESK_Z + 3),
      point(x + 0.38, y - 0.32, DESK_Z + 3),
      point(x + 0.38, y - 0.32, DESK_Z + 1),
      point(x - 0.38, y - 0.32, DESK_Z + 1)
    ],
    "#7fd0e81c"
  );
  fill(
    ctx,
    [
      point(x - 0.36, y + 0.15, DESK_Z + 32),
      point(x + 0.36, y + 0.15, DESK_Z + 32),
      point(x + 0.36, y + 0.15, DESK_Z + 5),
      point(x - 0.36, y + 0.15, DESK_Z + 5)
    ],
    "#171d27"
  );
  fill(
    ctx,
    [
      point(x - 0.32, y + 0.15, DESK_Z + 29),
      point(x + 0.32, y + 0.15, DESK_Z + 29),
      point(x + 0.32, y + 0.15, DESK_Z + 8),
      point(x - 0.32, y + 0.15, DESK_Z + 8)
    ],
    "#202938"
  );
  fill(
    ctx,
    [
      point(x - 0.36, y + 0.15, DESK_Z + 32),
      point(x + 0.36, y + 0.15, DESK_Z + 32),
      point(x + 0.36, y + 0.15, DESK_Z + 29),
      point(x - 0.36, y + 0.15, DESK_Z + 29)
    ],
    "#5fd0e8"
  );
  fill(
    ctx,
    [
      point(x - 0.36, y + 0.15, DESK_Z + 12),
      point(x - 0.32, y + 0.15, DESK_Z + 12),
      point(x - 0.32, y + 0.15, DESK_Z + 5),
      point(x - 0.36, y + 0.15, DESK_Z + 5)
    ],
    "#a06ad8"
  );
  fill(
    ctx,
    [
      point(x + 0.3, y + 0.15, DESK_Z + 15),
      point(x + 0.22, y + 0.15, DESK_Z + 15),
      point(x + 0.22, y + 0.15, DESK_Z + 12),
      point(x + 0.3, y + 0.15, DESK_Z + 12)
    ],
    "#f2c24a"
  );
}

function drawCabinet(ctx: CanvasRenderingContext2D) {
  boxTop(ctx, 12.4, 5.1, 14.0, 6.5, 48, "#d9d6cc");
  boxFront(ctx, 12.4, 14.0, 6.5, 0, 48, "#b9b9b3");
  boxSide(ctx, 5.1, 6.5, 14.0, 0, 48, "#9fa3a4");
  for (let i = 0; i < 3; i++) {
    fill(ctx, [point(12.55, 6.5, 42 - i * 13), point(13.85, 6.5, 42 - i * 13), point(13.85, 6.5, 34 - i * 13), point(12.55, 6.5, 34 - i * 13)], "#e8e5dc");
    fill(ctx, [point(13.05, 6.5, 37 - i * 13), point(13.3, 6.5, 37 - i * 13), point(13.3, 6.5, 35 - i * 13), point(13.05, 6.5, 35 - i * 13)], "#555d63");
  }
  fill(ctx, [point(13.0, 5.25, 62), point(13.35, 5.25, 62), point(13.35, 5.25, 54), point(13.0, 5.25, 54)], "#5a8f67");
  fill(ctx, [point(12.85, 5.25, 57), point(13.5, 5.25, 57), point(13.5, 5.25, 48), point(12.85, 5.25, 48)], "#b56a43");
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number) {
  fill(ctx, [point(x - 0.35, y + 0.25, 2), point(x + 0.35, y + 0.25, 2), point(x + 0.28, y + 0.55, 2), point(x - 0.28, y + 0.55, 2)], "#b76442");
  for (let i = 0; i < 4; i++) {
    fill(ctx, [point(x - 0.1, y + 0.1, 12 + i * 5), point(x + 0.1, y + 0.1, 12 + i * 5), point(x + 0.25, y - 0.15, 20 + i * 4), point(x, y - 0.3, 24 + i * 4)], i % 2 ? "#4e9964" : "#3d8055");
  }
}

export default function IsoTeamRoom({ agents, groupName, theme, selectedId, onSelect }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number; moved: boolean } | null>(null);
  const [size, setSize] = useState({ width: 1000, height: 720 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState<string | null>(null);
  const viewRef = useRef({ scale: 1, centerX: 0, centerY: 0 });

  const layout = useMemo(() => {
    const minX = -ROOM_H * (TILE_W / 2);
    const maxX = ROOM_W * (TILE_W / 2);
    const minY = -WALL_H;
    const maxY = (ROOM_W + ROOM_H) * (TILE_H / 2);
    const width = maxX - minX;
    const height = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const base = Math.min((size.width - 80) / width, (size.height - 80) / height);
    return { minX, maxX, minY, maxY, width, height, centerX, centerY, base };
  }, [size]);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const update = () => {
      const bounds = element.getBoundingClientRect();
      setSize({ width: Math.max(360, Math.floor(bounds.width)), height: Math.max(300, Math.floor(bounds.height)) });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let frame = 0;
    const draw = (time: number) => {
      const scale = layout.base * zoom;
      viewRef.current = { scale, centerX: layout.centerX, centerY: layout.centerY };
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size.width, size.height);
      const background = ctx.createLinearGradient(0, 0, 0, size.height);
      background.addColorStop(0, "#eeeaf7");
      background.addColorStop(1, "#ddd9eb");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, size.width, size.height);

      ctx.save();
      ctx.translate(size.width / 2 + pan.x, size.height / 2 + pan.y);
      ctx.scale(scale, scale);
      ctx.translate(-layout.centerX, -layout.centerY);

      drawFloor(ctx);
      drawWindowLight(ctx);
      drawShadows(ctx);
      drawWalls(ctx);
      drawWindowArt(ctx);
      drawWallClock(ctx);

      const sign = project(11.6, 0, 71);
      ctx.font = "bold 11px ui-monospace, Consolas, monospace";
      ctx.fillStyle = "#f4f6f8";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(groupName.toUpperCase(), sign.x, sign.y);

      drawPlant(ctx, 1.3, 1.2);

      agents.forEach((agent, index) => {
        const station = STATIONS[index];
        if (!station) return;
        drawDesk(ctx, station.x, station.y, theme);
        drawLaptop(ctx, station.x, station.y + MONITOR_DY);
        drawPapers(ctx, station.x - DESK_W / 2 + 0.28, station.y + DESK_D / 2 - 0.2);
        drawMug(ctx, station.x + DESK_W / 2 - 0.35, station.y + 0.1);
        drawChair(ctx, station.x, station.y + CHAIR_DY, agent.colors.shirt);
        const seat = point(station.x, station.y + CAT_DY, SEAT_Z);
        drawIsoAgent(ctx, agent, seat.x, seat.y, time, agent.id === selectedId);
      });

      drawCabinet(ctx);
      drawPlant(ctx, 13.3, 7.6);
      drawTrash(ctx, 1.35, 5.85);

      const dust = (time / 9000) % 1;
      for (let i = 0; i < 14; i++) {
        const x = 3.7 + ((i * 37) % 40) / 10;
        const y = ((i * 17) % 40) / 10;
        ctx.fillStyle = `rgba(255, 250, 220, ${0.08 + (i % 3) * 0.04})`;
        const mote = point(x, y);
        ctx.fillRect(mote.x, mote.y, 1, 1);
      }
      ctx.fillStyle = `rgba(255, 250, 220, ${0.08 + Math.sin(dust * Math.PI * 2) * 0.04})`;
      const moteA = point(5.4, 1.8);
      const moteB = point(7.3, 2.7);
      ctx.fillRect(moteA.x, moteA.y, 2, 2);
      ctx.fillRect(moteB.x, moteB.y, 1, 1);

      if (hover) {
        const index = agents.findIndex((agent) => agent.id === hover);
        const station = STATIONS[index];
        if (index >= 0 && station) {
          const seat = point(station.x, station.y + CAT_DY, SEAT_Z);
          ctx.strokeStyle = "#ffffff88";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(seat.x, seat.y, 22, 9, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
      drawVignette(ctx, size.width, size.height);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [agents, groupName, hover, layout, pan, selectedId, size, theme, zoom]);

  const toLocal = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const bounds = canvas.getBoundingClientRect();
    const { scale, centerX, centerY } = viewRef.current;
    return {
      x: (clientX - bounds.left - size.width / 2 - pan.x) / scale + centerX,
      y: (clientY - bounds.top - size.height / 2 - pan.y) / scale + centerY
    };
  };

  const findAgent = (clientX: number, clientY: number) => {
    const local = toLocal(clientX, clientY);
    for (const agent of agents) {
      const index = agents.indexOf(agent);
      const station = STATIONS[index];
      if (!station) continue;
      const seat = point(station.x, station.y + CAT_DY, SEAT_Z);
      if (local.x > seat.x - 22 && local.x < seat.x + 22 && local.y > seat.y - 66 && local.y < seat.y + 8) {
        return agent;
      }
    }
    return null;
  };

  const zoomAt = (clientX: number, clientY: number, nextZoom: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const px = clientX - bounds.left;
    const py = clientY - bounds.top;
    const clamped = Math.max(0.55, Math.min(2.4, nextZoom));
    const oldScale = layout.base * zoom;
    const nextScale = layout.base * clamped;
    const worldX = (px - size.width / 2 - pan.x) / oldScale + layout.centerX;
    const worldY = (py - size.height / 2 - pan.y) / oldScale + layout.centerY;
    setPan({
      x: px - size.width / 2 - (worldX - layout.centerX) * nextScale,
      y: py - size.height / 2 - (worldY - layout.centerY) * nextScale
    });
    setZoom(clamped);
  };

  return (
    <div ref={wrapRef} className="iso-room">
      <canvas
        ref={canvasRef}
        onMouseMove={(event) => {
          setHover(findAgent(event.clientX, event.clientY)?.id ?? null);
          const drag = dragRef.current;
          if (drag) {
            const dx = event.clientX - drag.x;
            const dy = event.clientY - drag.y;
            if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
            setPan({ x: drag.panX + dx, y: drag.panY + dy });
          }
        }}
        onMouseLeave={() => setHover(null)}
        onMouseDown={(event) => {
          dragRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y, moved: false };
        }}
        onMouseUp={(event) => {
          if (!dragRef.current?.moved) {
            const agent = findAgent(event.clientX, event.clientY);
            if (agent) onSelect(agent.id);
          }
          dragRef.current = null;
        }}
        onWheel={(event) => {
          event.preventDefault();
          zoomAt(event.clientX, event.clientY, zoom - event.deltaY * 0.001);
        }}
      />
      <div className="iso-controls">
        <button type="button" className="pill" onClick={() => setZoom((value) => Math.max(0.55, value - 0.15))}>
          −
        </button>
        <button type="button" className="pill" onClick={() => setZoom((value) => Math.min(2.4, value + 0.15))}>
          +
        </button>
        <button
          type="button"
          className="pill"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          AJUSTAR
        </button>
      </div>
      <div className="iso-caption">
        <b>{groupName}</b>
        <span>clic en un gatito para seleccionar</span>
      </div>
    </div>
  );
}
