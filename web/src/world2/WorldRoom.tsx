import { useEffect, useMemo, useRef, useState } from "react";
import type { ThemeName } from "../office/sprites";
import { drawIsoAgent, type IsoAgent } from "../iso/isoAvatar";
import { fill, path, project, shade } from "../iso/projection";
import type { LayoutItem, LayoutSeat, LayoutV2 } from "./schema";
import defaultLayout from "./layout-v2.json";

const layout = defaultLayout as LayoutV2;
const TILE_W = layout.tile.w;
const TILE_H = layout.tile.h;
const WALL_H = layout.wallHeight;
const ROOM_W = layout.room.width;
const ROOM_H = layout.room.height;
const SEAT_Z = 18;

type Props = {
  agents: IsoAgent[];
  groupName: string;
  theme: ThemeName;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function point(x: number, y: number, z = 0) {
  return { x: (x - y) * (TILE_W / 2), y: (x + y) * (TILE_H / 2) - z };
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function quad(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, z1: number, z2: number, color: string) {
  fill(ctx, [point(x1, y1, z2), point(x2, y1, z2), point(x2, y2, z1), point(x1, y2, z1)], color);
}

function top(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, d: number, z: number, color: string) {
  fill(ctx, [point(x - w / 2, y - d / 2, z), point(x + w / 2, y - d / 2, z), point(x + w / 2, y + d / 2, z), point(x - w / 2, y + d / 2, z)], color);
}

function front(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, d: number, z1: number, z2: number, color: string) {
  fill(ctx, [point(x - w / 2, y + d / 2, z2), point(x + w / 2, y + d / 2, z2), point(x + w / 2, y + d / 2, z1), point(x - w / 2, y + d / 2, z1)], color);
}

function side(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, d: number, z1: number, z2: number, color: string) {
  fill(ctx, [point(x + w / 2, y - d / 2, z2), point(x + w / 2, y + d / 2, z2), point(x + w / 2, y + d / 2, z1), point(x + w / 2, y - d / 2, z1)], color);
}

function drawRoom(ctx: CanvasRenderingContext2D, time: number) {
  const floorA = "#ecebe5";
  const floorB = "#e3e1d9";
  for (let y = 0; y < ROOM_H; y++) {
    for (let x = 0; x < ROOM_W; x++) {
      const p = point(x, y);
      const p2 = point(x + 1, y);
      const p3 = point(x + 1, y + 1);
      const p4 = point(x, y + 1);
      fill(ctx, [p, p2, p3, p4], (x + y) % 2 === 0 ? floorA : floorB);
      path(ctx, [p, p2, p3, p4]);
      ctx.strokeStyle = "#c9c7bf";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  fill(ctx, [point(0, 0, WALL_H), point(ROOM_W, 0, WALL_H), point(ROOM_W, 0, 0), point(0, 0, 0)], "#eee8d8");
  fill(ctx, [point(0, 0, WALL_H), point(0, ROOM_H, WALL_H), point(0, ROOM_H, 0), point(0, 0, 0)], "#e4ddcd");
  fill(ctx, [point(0, 0, WALL_H), point(ROOM_W, 0, WALL_H), point(ROOM_W, 0, WALL_H - 7), point(0, 0, WALL_H - 7)], "#f7f1e2");
  fill(ctx, [point(0, 0, 10), point(ROOM_W, 0, 10), point(ROOM_W, 0, 0), point(0, 0, 0)], "#d3cbb9");
  fill(ctx, [point(0, 0, 10), point(0, ROOM_H, 10), point(0, ROOM_H, 0), point(0, 0, 0)], "#c8c0ae");

  fill(ctx, [point(3.1, 0.1), point(8.2, 0.1), point(10.3, 4.7), point(5.2, 4.7)], "#fff4c92c");
  for (let i = 0; i < 6; i++) {
    fill(ctx, [point(3.6 + i * 0.78, 0.1), point(4.0 + i * 0.78, 0.1), point(6.0 + i * 0.78, 4.6), point(5.6 + i * 0.78, 4.6)], "#fff8dc20");
  }

  const dust = (time / 9000) % 1;
  for (let i = 0; i < 12; i++) {
    const dx = 3.8 + ((i * 37) % 40) / 10;
    const dy = ((i * 17) % 40) / 10;
    const mote = point(dx, dy);
    ctx.fillStyle = `rgba(255,250,220,${0.08 + (i % 3) * 0.04})`;
    ctx.fillRect(mote.x, mote.y, 1, 1);
  }
  const mote = point(5.4, 1.8);
  ctx.fillStyle = `rgba(255,250,220,${0.08 + Math.sin(dust * Math.PI * 2) * 0.04})`;
  ctx.fillRect(mote.x, mote.y, 2, 2);
}

function drawDesk(ctx: CanvasRenderingContext2D, item: LayoutItem, theme: ThemeName) {
  const w = item.width ?? 2.4;
  const d = item.depth ?? 1.2;
  const z = item.height ?? 22;
  top(ctx, item.x, item.y, w, d, z, theme === "esmeralda" ? "#d6b77a" : "#e6bd79");
  front(ctx, item.x, item.y, w, d, z - 18, z, "#a95d54");
  side(ctx, item.x, item.y, w, d, z - 18, z, "#8f4b48");
  front(ctx, item.x, item.y, w, d, 0, z - 18, "#b9685c");
  for (const lx of [item.x - w / 2 + 0.2, item.x + w / 2 - 0.2]) {
    fill(ctx, [point(lx, item.y + d / 2, 18), point(lx + 0.12, item.y + d / 2, 18), point(lx + 0.12, item.y + d / 2, 0), point(lx, item.y + d / 2, 0)], "#8b4e3b");
  }
  const px = point(item.x - 0.4, item.y + 0.25, 23);
  const py = point(item.x + 0.2, item.y + 0.25, 23);
  ctx.fillStyle = "#f5f1e5";
  ctx.fillRect(px.x, px.y, 8, 3);
  ctx.fillRect(py.x, py.y, 6, 3);
}

function drawMonitor(ctx: CanvasRenderingContext2D, item: LayoutItem) {
  const x = item.x;
  const y = item.y;
  const z = item.height ?? 34;
  top(ctx, x, y, 0.5, 0.32, 22, "#252d3a");
  fill(ctx, [point(x - 0.06, y, 34), point(x + 0.06, y, 34), point(x + 0.06, y, 22), point(x - 0.06, y, 22)], "#343c49");
  fill(ctx, [point(x - 0.34, y + 0.12, 53), point(x + 0.34, y + 0.12, 53), point(x + 0.34, y + 0.12, 28), point(x - 0.34, y + 0.12, 28)], "#202631");
  fill(ctx, [point(x - 0.3, y + 0.1, 51), point(x + 0.3, y + 0.1, 51), point(x + 0.3, y + 0.1, 30), point(x - 0.3, y + 0.1, 30)], "#79accb");
  fill(ctx, [point(x - 0.24, y + 0.09, 48), point(x + 0.02, y + 0.09, 48), point(x + 0.02, y + 0.09, 46), point(x - 0.24, y + 0.09, 46)], "#d5edf5");
  fill(ctx, [point(x - 0.24, y + 0.09, 44), point(x + 0.18, y + 0.09, 44), point(x + 0.18, y + 0.09, 42), point(x - 0.24, y + 0.09, 42)], "#5d99b8");
  fill(ctx, [point(x - 0.36, y - 0.28, 24), point(x + 0.36, y - 0.28, 24), point(x + 0.36, y - 0.28, 22), point(x - 0.36, y - 0.28, 22)], "#7fd0e81c");
}

function drawChair(ctx: CanvasRenderingContext2D, item: LayoutItem, accent: string) {
  const x = item.x;
  const y = item.y;
  const base = point(x, y + 0.35, 0);
  ctx.strokeStyle = "#313747";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  for (const [dx, dy] of [[0.38, 0], [-0.38, 0], [0, 0.32], [0, -0.32], [0.25, 0.23]]) {
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
  top(ctx, x, y, 0.8, 0.48, 18, shade(accent, 0.9));
  front(ctx, x, y, 0.8, 0.48, 8, 18, shade(accent, 0.55));
  side(ctx, x, y, 0.8, 0.48, 8, 18, shade(accent, 0.42));
  fill(ctx, [point(x - 0.34, y - 0.13, 19), point(x + 0.34, y - 0.13, 19), point(x + 0.34, y + 0.2, 19), point(x - 0.34, y + 0.2, 19)], shade(accent, 1.2));
  fill(ctx, [point(x - 0.38, y - 0.34, 18), point(x + 0.38, y - 0.34, 18), point(x + 0.38, y - 0.34, 46), point(x - 0.38, y - 0.34, 46)], "#202532");
  fill(ctx, [point(x - 0.42, y - 0.42, 18), point(x - 0.3, y - 0.42, 18), point(x - 0.3, y - 0.42, 44), point(x - 0.42, y - 0.42, 44)], accent);
  fill(ctx, [point(x + 0.3, y - 0.42, 18), point(x + 0.42, y - 0.42, 18), point(x + 0.42, y - 0.42, 44), point(x + 0.3, y - 0.42, 44)], accent);
  fill(ctx, [point(x - 0.3, y - 0.42, 46), point(x + 0.3, y - 0.42, 46), point(x + 0.3, y - 0.42, 43), point(x - 0.3, y - 0.42, 43)], "#2c3343");
}

function drawCabinet(ctx: CanvasRenderingContext2D, item: LayoutItem) {
  const x = item.x;
  const y = item.y;
  const w = item.width ?? 1.6;
  const d = item.depth ?? 1.1;
  top(ctx, x, y, w, d, 48, "#d9d6cc");
  front(ctx, x, y, w, d, 0, 48, "#b9b9b3");
  side(ctx, x, y, w, d, 0, 48, "#9fa3a4");
  for (let i = 0; i < 3; i++) {
    fill(ctx, [point(x - w / 2 + 0.1, y + d / 2, 40 - i * 12), point(x + w / 2 - 0.1, y + d / 2, 40 - i * 12), point(x + w / 2 - 0.1, y + d / 2, 33 - i * 12), point(x - w / 2 + 0.1, y + d / 2, 33 - i * 12)], "#e8e5dc");
  }
}

function drawPlant(ctx: CanvasRenderingContext2D, item: LayoutItem) {
  const x = item.x;
  const y = item.y;
  fill(ctx, [point(x - 0.28, y + 0.2, 2), point(x + 0.28, y + 0.2, 2), point(x + 0.24, y + 0.45, 2), point(x - 0.24, y + 0.45, 2)], "#b76442");
  for (let i = 0; i < 4; i++) {
    fill(ctx, [point(x - 0.08, y + 0.05, 12 + i * 4), point(x + 0.08, y + 0.05, 12 + i * 4), point(x + 0.22, y - 0.12, 19 + i * 4), point(x, y - 0.26, 23 + i * 4)], i % 2 ? "#4e9964" : "#3d8055");
  }
}

function drawTrash(ctx: CanvasRenderingContext2D, item: LayoutItem) {
  const x = item.x;
  const y = item.y;
  fill(ctx, [point(x - 0.18, y - 0.16, 17), point(x + 0.18, y - 0.16, 17), point(x + 0.18, y + 0.16, 0), point(x - 0.18, y + 0.16, 0)], "#59616a");
}

function drawLamp(ctx: CanvasRenderingContext2D, item: LayoutItem) {
  const x = item.x;
  const y = item.y;
  fill(ctx, [point(x - 0.06, y, 36), point(x + 0.06, y, 36), point(x + 0.06, y, 8), point(x - 0.06, y, 8)], "#5a6270");
  fill(ctx, [point(x - 0.3, y, 42), point(x + 0.3, y, 42), point(x + 0.18, y, 34), point(x - 0.18, y, 34)], "#f2c24a");
}

function drawRug(ctx: CanvasRenderingContext2D, item: LayoutItem) {
  const w = item.width ?? 5;
  const d = item.depth ?? 3;
  top(ctx, item.x, item.y, w, d, 0.5, "#c5d4dc");
  path(ctx, [point(item.x - w / 2 + 0.2, item.y - d / 2 + 0.2), point(item.x + w / 2 - 0.2, item.y - d / 2 + 0.2), point(item.x + w / 2 - 0.2, item.y + d / 2 - 0.2), point(item.x - w / 2 + 0.2, item.y + d / 2 - 0.2)]);
  ctx.strokeStyle = "#aebfc9";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawWallDecor(ctx: CanvasRenderingContext2D, item: LayoutItem, groupName: string) {
  if (item.type === "window") {
    fill(ctx, [point(item.x - 2.4, 0, 92), point(item.x + 2.4, 0, 92), point(item.x + 2.4, 0, 48), point(item.x - 2.4, 0, 48)], "#f0e7d4");
    fill(ctx, [point(item.x - 2.2, 0, 88), point(item.x + 2.2, 0, 88), point(item.x + 2.2, 0, 52), point(item.x - 2.2, 0, 52)], "#8fc9da");
    for (let i = 0; i < 6; i++) {
      fill(ctx, [point(item.x - 2.2 + i * 0.72, 0, 88), point(item.x - 1.95 + i * 0.72, 0, 88), point(item.x - 1.95 + i * 0.72, 0, 52), point(item.x - 2.2 + i * 0.72, 0, 52)], "#d8edf3");
    }
  } else if (item.type === "sign") {
    fill(ctx, [point(item.x - 2.1, 0, 86), point(item.x + 2.1, 0, 86), point(item.x + 2.1, 0, 54), point(item.x - 2.1, 0, 54)], "#2f3e52");
    fill(ctx, [point(item.x - 1.98, 0, 83), point(item.x + 1.98, 0, 83), point(item.x + 1.98, 0, 57), point(item.x - 1.98, 0, 57)], "#3d5068");
    const sign = project(item.x, 0, 71);
    ctx.font = "bold 10px ui-monospace, Consolas, monospace";
    ctx.fillStyle = "#f4f6f8";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(groupName.toUpperCase(), sign.x, sign.y);
  } else if (item.type === "art") {
    fill(ctx, [point(0, item.y - 0.8, 76), point(0, item.y + 0.8, 76), point(0, item.y + 0.8, 50), point(0, item.y - 0.8, 50)], "#e8a14a");
    fill(ctx, [point(0, item.y - 0.65, 73), point(0, item.y + 0.65, 73), point(0, item.y + 0.65, 53), point(0, item.y - 0.65, 53)], "#9fc7da");
  }
}

function drawVignette(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.2, width / 2, height / 2, Math.max(width, height) * 0.72);
  gradient.addColorStop(0, "#00000000");
  gradient.addColorStop(1, "#1f22331c");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export default function WorldRoom({ agents, groupName, theme, selectedId, onSelect }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number; moved: boolean } | null>(null);
  const [size, setSize] = useState({ width: 1000, height: 720 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState<string | null>(null);
  const viewRef = useRef({ scale: 1, centerX: 0, centerY: 0 });

  const room = useMemo(() => {
    const minX = -ROOM_H * (TILE_W / 2);
    const maxX = ROOM_W * (TILE_W / 2);
    const minY = -WALL_H;
    const maxY = (ROOM_W + ROOM_H) * (TILE_H / 2);
    const width = maxX - minX;
    const height = maxY - minY;
    return {
      minX,
      maxX,
      minY,
      maxY,
      width,
      height,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      base: Math.min((size.width - 80) / width, (size.height - 80) / height)
    };
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

  const seatAgent = (seat: LayoutSeat) => agents.find((agent, index) => layout.seats[index]?.id === seat.id);
  const selectedPoint = (seat: LayoutSeat) => point(seat.x, seat.y, seat.z ?? SEAT_Z);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;

    let frame = 0;
    const draw = (time: number) => {
      const scale = room.base * zoom;
      viewRef.current = { scale, centerX: room.centerX, centerY: room.centerY };
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const background = ctx.createLinearGradient(0, 0, 0, size.height);
      background.addColorStop(0, "#eeeaf7");
      background.addColorStop(1, "#ddd9eb");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, size.width, size.height);

      ctx.save();
      ctx.translate(size.width / 2 + pan.x, size.height / 2 + pan.y);
      ctx.scale(scale, scale);
      ctx.translate(-room.centerX, -room.centerY);

      drawRoom(ctx, time);

      const wallItems = layout.items.filter((item) => item.type === "window" || item.type === "sign" || item.type === "art");
      for (const item of wallItems) drawWallDecor(ctx, item, groupName);

      const rugs = layout.items.filter((item) => item.type === "rug");
      for (const item of rugs) drawRug(ctx, item);

      const furniture = layout.items.filter((item) => ["desk", "monitor", "cabinet", "plant", "lamp", "trash"].includes(item.type)).sort((a, b) => a.y - b.y);
      for (const item of furniture) {
        if (item.type === "desk") drawDesk(ctx, item, theme);
        else if (item.type === "monitor") drawMonitor(ctx, item);
        else if (item.type === "cabinet") drawCabinet(ctx, item);
        else if (item.type === "plant") drawPlant(ctx, item);
        else if (item.type === "lamp") drawLamp(ctx, item);
        else if (item.type === "trash") drawTrash(ctx, item);
      }

      layout.seats.forEach((seat, index) => {
        const agent = agents[index];
        const chair = layout.items.find((item) => item.id === seat.chairId);
        if (chair && agent) drawChair(ctx, chair, agent.colors.shirt);
      });
      layout.seats.forEach((seat, index) => {
        const agent = agents[index];
        if (!agent) return;
        const p = selectedPoint(seat);
        drawIsoAgent(ctx, agent, p.x, p.y, time, agent.id === selectedId);
      });

      if (hover) {
        const index = agents.findIndex((agent) => agent.id === hover);
        const seat = index >= 0 ? layout.seats[index] : undefined;
        if (seat) {
          const p = selectedPoint(seat);
          ctx.strokeStyle = "#ffffff88";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, 22, 9, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
      drawVignette(ctx, size.width, size.height);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [agents, groupName, hover, room, selectedId, size, theme, zoom, pan]);

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
    for (let index = 0; index < layout.seats.length; index++) {
      const p = selectedPoint(layout.seats[index]);
      if (local.x > p.x - 22 && local.x < p.x + 22 && local.y > p.y - 66 && local.y < p.y + 8) {
        return agents[index] ?? null;
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
    const clamped = Math.max(0.55, Math.min(2.6, nextZoom));
    const oldScale = room.base * zoom;
    const nextScale = room.base * clamped;
    const worldX = (px - size.width / 2 - pan.x) / oldScale + room.centerX;
    const worldY = (py - size.height / 2 - pan.y) / oldScale + room.centerY;
    setPan({
      x: px - size.width / 2 - (worldX - room.centerX) * nextScale,
      y: py - size.height / 2 - (worldY - room.centerY) * nextScale
    });
    setZoom(clamped);
  };

  return (
    <div ref={wrapRef} className="iso-room">
      <canvas
        ref={canvasRef}
        onMouseMove={(event) => {
          const agent = findAgent(event.clientX, event.clientY);
          setHover(agent?.id ?? null);
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
        <button type="button" className="pill" onClick={() => zoomAt(size.width / 2, size.height / 2, zoom - 0.15)}>
          −
        </button>
        <button type="button" className="pill" onClick={() => zoomAt(size.width / 2, size.height / 2, zoom + 0.15)}>
          +
        </button>
        <button type="button" className="pill" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
          AJUSTAR
        </button>
      </div>
      <div className="iso-caption">
        <b>{groupName}</b>
        <span>V2 · sala de equipo · clic en un gatito para seleccionar</span>
      </div>
    </div>
  );
}
