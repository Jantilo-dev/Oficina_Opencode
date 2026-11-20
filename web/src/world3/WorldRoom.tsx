import { useEffect, useMemo, useRef, useState } from "react";
import type { ThemeName } from "../office/sprites";
import layoutData from "./layout-v3.json";
import { DESIGN_SHEETS } from "./assetCatalog";
import type { OfficeItem, OfficeLayout } from "./schema";

const layout = layoutData as OfficeLayout;
export const TILE_W = 32;
export const TILE_H = 16;
export const WALL_HEIGHT = 112;
export const ROOM_W = layout.room.width;
export const ROOM_H = layout.room.height;
export const WORLD_LAYOUT_STORAGE_KEY = "pixel-office-world3-layout-clean";

type Props = {
  theme: ThemeName;
};

type DragState = {
  x: number;
  y: number;
  panX: number;
  panY: number;
};

function readSavedLayout(): OfficeLayout {
  try {
    const raw = window.localStorage.getItem(WORLD_LAYOUT_STORAGE_KEY);
    if (!raw) return layout;
    const value = JSON.parse(raw) as Partial<OfficeLayout>;
    if (value.version !== 3 || !value.room || !Array.isArray(value.items)) return layout;
    return {
      ...value,
      items: (value.items as OfficeItem[]).map((item) => item.type === "desk"
        ? { ...item, x: Math.round(item.x), y: Math.round(item.y) }
        : item)
    } as OfficeLayout;
  } catch {
    return layout;
  }
}

type SourceName = keyof Pick<typeof DESIGN_SHEETS, "coffee" | "water" | "deskSingle" | "deskSingleBack" | "deskDual" | "deskDualBack" | "deskDouble" | "deskDoubleBack" | "printer" | "meetingTable" | "plant" | "whiteboard" | "armchair" | "chairSeparated" | "chairSeparatedBack" | "wall1" | "wall2" | "catMale" | "catFemale" | "catMaleSeated" | "catFemaleSeated" | "catMaleSeatedBack" | "catFemaleSeatedBack">;

type Crop = {
  source: SourceName;
  column?: number;
  row?: number;
  columns?: number;
  rows?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  scale: number;
  heightRatio?: number;
  trim?: number;
  anchorY?: number;
  frames?: Array<{ column: number; row: number }>;
};

export type Sprite = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  scale: number;
  anchorY: number;
  frames?: HTMLCanvasElement[];
};

const CROPS: Record<string, Crop> = {
  desk: { source: "deskDual", scale: 0.07, trim: 2 },
  deskBack: { source: "deskDualBack", scale: 0.07, trim: 2 },
  deskLaptop: { source: "deskSingle", scale: 0.07, trim: 2 },
  deskLaptopBack: { source: "deskSingleBack", scale: 0.07, trim: 2 },
  meetingTable: { source: "meetingTable", scale: 0.07, trim: 2 },
  table: { source: "meetingTable", scale: 0.07, trim: 2 },
  receptionDesk: { source: "deskDouble", scale: 0.07, trim: 2 },
  receptionDeskBack: { source: "deskDoubleBack", scale: 0.07, trim: 2 },
  chair: { source: "chairSeparated", scale: 0.03, trim: 2 },
  chairBack: { source: "chairSeparatedBack", scale: 0.03, trim: 2 },
  meetingChair: { source: "chairSeparated", scale: 0.03, trim: 2 },
  sofa: { source: "armchair", scale: 0.06, trim: 2 },
  armchair: { source: "armchair", scale: 0.06, trim: 2 },
  printer: { source: "printer", scale: 0.055, trim: 2 },
  plant: { source: "plant", scale: 0.06, trim: 2 },
  water: { source: "water", scale: 0.055, trim: 2 },
  coffee: { source: "coffee", scale: 0.055, trim: 2 },
  whiteboard: { source: "whiteboard", scale: 0.045, trim: 2 },
  wall1: { source: "wall1", scale: 0.045, trim: 2 },
  wall2: { source: "wall2", scale: 0.058, trim: 2 },
  catMale: { source: "catMale", x: 0, y: 0, width: 144, height: 264, scale: 0.16, trim: 0 },
  catFemale: { source: "catFemale", x: 0, y: 0, width: 144, height: 264, scale: 0.16, trim: 0 },
  catMaleSeated: { source: "catMaleSeated", x: 0, y: 0, width: 156, height: 240, scale: 0.18, trim: 0 },
  catFemaleSeated: { source: "catFemaleSeated", x: 0, y: 0, width: 156, height: 240, scale: 0.18, trim: 0 },
  catMaleSeatedBack: { source: "catMaleSeatedBack", x: 0, y: 0, width: 156, height: 240, scale: 0.18, trim: 0 },
  catFemaleSeatedBack: { source: "catFemaleSeatedBack", x: 0, y: 0, width: 156, height: 240, scale: 0.18, trim: 0 }
};

const SOURCE_PATHS: Record<SourceName, string> = {
  coffee: DESIGN_SHEETS.coffee,
  water: DESIGN_SHEETS.water,
  deskSingle: DESIGN_SHEETS.deskSingle,
  deskSingleBack: DESIGN_SHEETS.deskSingleBack,
  deskDual: DESIGN_SHEETS.deskDual,
  deskDualBack: DESIGN_SHEETS.deskDualBack,
  deskDouble: DESIGN_SHEETS.deskDouble,
  deskDoubleBack: DESIGN_SHEETS.deskDoubleBack,
  printer: DESIGN_SHEETS.printer,
  meetingTable: DESIGN_SHEETS.meetingTable,
  plant: DESIGN_SHEETS.plant,
  whiteboard: DESIGN_SHEETS.whiteboard,
  armchair: DESIGN_SHEETS.armchair,
  chairSeparated: DESIGN_SHEETS.chairSeparated,
  chairSeparatedBack: DESIGN_SHEETS.chairSeparatedBack,
  wall1: DESIGN_SHEETS.wall1,
  wall2: DESIGN_SHEETS.wall2,
  catMale: DESIGN_SHEETS.catMale,
  catFemale: DESIGN_SHEETS.catFemale,
  catMaleSeated: DESIGN_SHEETS.catMaleSeated,
  catFemaleSeated: DESIGN_SHEETS.catFemaleSeated,
  catMaleSeatedBack: DESIGN_SHEETS.catMaleSeatedBack,
  catFemaleSeatedBack: DESIGN_SHEETS.catFemaleSeatedBack
};

export function point(x: number, y: number, z = 0) {
  return {
    x: (x - y) * (TILE_W / 2),
    y: (x + y) * (TILE_H / 2) - z
  };
}

function fill(ctx: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>, color: string) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index++) ctx.lineTo(points[index].x, points[index].y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function cropSpriteFrame(image: HTMLImageElement, crop: Crop, frame?: { column: number; row: number }): Sprite {
  const cellWidth = image.naturalWidth / (crop.columns ?? 1);
  const cellHeight = image.naturalHeight / (crop.rows ?? 1);
  const margin = 10;
  const sx = Math.round(crop.x ?? (frame?.column ?? crop.column ?? 0) * cellWidth + margin);
  const sy = Math.round(crop.y ?? (frame?.row ?? crop.row ?? 0) * cellHeight + margin);
  const sw = Math.round(crop.width ?? cellWidth - margin * 2);
  const sh = Math.round((crop.height ?? cellHeight) * (crop.heightRatio ?? 1) - margin * 2);
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { canvas, width: sw, height: sh, scale: crop.scale, anchorY: sh };
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  const pixels = ctx.getImageData(0, 0, sw, sh);
  const background = new Uint8Array(sw * sh);
  const pending: number[] = [];
  const isBackground = (offset: number) => {
    const red = pixels.data[offset];
    const green = pixels.data[offset + 1];
    const blue = pixels.data[offset + 2];
    const spread = Math.max(red, green, blue) - Math.min(red, green, blue);
    // Keep the light colors used by the products; remove only near-white background pixels.
    return red > 165 && green > 165 && blue > 165 && spread < 36;
  };
  const queue = (x: number, y: number) => {
    const index = y * sw + x;
    if (background[index] || !isBackground(index * 4)) return;
    background[index] = 1;
    pending.push(index);
  };
  for (let x = 0; x < sw; x++) {
    queue(x, 0);
    queue(x, sh - 1);
  }
  for (let y = 1; y < sh - 1; y++) {
    queue(0, y);
    queue(sw - 1, y);
  }
  while (pending.length > 0) {
    const index = pending.pop() as number;
    const x = index % sw;
    const y = Math.floor(index / sw);
    if (x > 0) queue(x - 1, y);
    if (x + 1 < sw) queue(x + 1, y);
    if (y > 0) queue(x, y - 1);
    if (y + 1 < sh) queue(x, y + 1);
  }
  const isNearWhite = (offset: number) => {
    const red = pixels.data[offset];
    const green = pixels.data[offset + 1];
    const blue = pixels.data[offset + 2];
    const spread = Math.max(red, green, blue) - Math.min(red, green, blue);
    return red > 205 && green > 205 && blue > 205 && spread < 25;
  };
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 1; y < sh - 1; y++) {
      for (let x = 1; x < sw - 1; x++) {
        const index = y * sw + x;
        if (background[index] || !isNearWhite(index * 4)) continue;
        if (background[index - 1] || background[index + 1] || background[index - sw] || background[index + sw]) background[index] = 1;
      }
    }
  }
  for (let index = 0; index < background.length; index++) {
    if (background[index]) pixels.data[index * 4 + 3] = 0;
  }
  ctx.putImageData(pixels, 0, 0);
  let minX = sw;
  let minY = sh;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      if (pixels.data[(y * sw + x) * 4 + 3] === 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) return { canvas, width: sw, height: sh, scale: crop.scale, anchorY: sh };
  const trim = crop.trim ?? 4;
  const left = Math.max(0, minX - trim);
  const top = Math.max(0, minY - trim);
  const right = Math.min(sw, maxX + trim + 1);
  const bottom = Math.min(sh, maxY + trim + 1);
  const trimmed = document.createElement("canvas");
  trimmed.width = right - left;
  trimmed.height = bottom - top;
  const trimmedCtx = trimmed.getContext("2d");
  trimmedCtx?.drawImage(canvas, left, top, trimmed.width, trimmed.height, 0, 0, trimmed.width, trimmed.height);
  return { canvas: trimmed, width: trimmed.width, height: trimmed.height, scale: crop.scale, anchorY: trimmed.height };
}

function cropSprite(image: HTMLImageElement, crop: Crop): Sprite {
  const frames = crop.frames?.map((frame) => cropSpriteFrame(image, crop, frame).canvas);
  const first = cropSpriteFrame(image, crop, crop.frames?.[0]);
  return frames ? { ...first, frames } : first;
}

function loadImages(): Promise<Record<SourceName, HTMLImageElement>> {
  return Promise.all(
    (Object.entries(SOURCE_PATHS) as Array<[SourceName, string]>).map(
      ([name, src]) =>
        new Promise<[SourceName, HTMLImageElement]>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve([name, image]);
          image.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
          image.src = src;
        })
    )
  ).then((entries) => Object.fromEntries(entries) as Record<SourceName, HTMLImageElement>);
}

export function loadSpriteCatalog(): Promise<Map<string, Sprite>> {
  return loadImages().then((images) => {
    const sprites = new Map<string, Sprite>();
    for (const [key, crop] of Object.entries(CROPS)) sprites.set(key, cropSprite(images[crop.source], crop));
    return sprites;
  });
}

export function drawFloor(ctx: CanvasRenderingContext2D) {
  for (let y = 0; y < ROOM_H; y++) {
    for (let x = 0; x < ROOM_W; x++) {
      const color = (x + y) % 2 === 0 ? "#6f9994" : "#618985";
      fill(ctx, [point(x, y), point(x + 1, y), point(x + 1, y + 1), point(x, y + 1)], color);
      ctx.strokeStyle = "#547a78";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      const a = point(x, y);
      const b = point(x + 1, y);
      const c = point(x + 1, y + 1);
      const d = point(x, y + 1);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.closePath();
      ctx.stroke();
    }
  }
}

export function drawWalls(ctx: CanvasRenderingContext2D) {
  fill(ctx, [point(0, 0, WALL_HEIGHT), point(ROOM_W, 0, WALL_HEIGHT), point(ROOM_W, 0), point(0, 0)], "#eadcc2");
  fill(ctx, [point(0, 0, WALL_HEIGHT), point(0, ROOM_H, WALL_HEIGHT), point(0, ROOM_H), point(0, 0)], "#d9d2c0");
  fill(ctx, [point(0, 0, WALL_HEIGHT), point(ROOM_W, 0, WALL_HEIGHT), point(ROOM_W, 0, WALL_HEIGHT - 8), point(0, 0, WALL_HEIGHT - 8)], "#f5ead5");
  fill(ctx, [point(0, 0, 10), point(ROOM_W, 0, 10), point(ROOM_W, 0), point(0, 0)], "#c6bba8");
  fill(ctx, [point(0, 0, 10), point(0, ROOM_H, 10), point(0, ROOM_H), point(0, 0)], "#bfb6a5");
  ctx.strokeStyle = "#766d61";
  ctx.lineWidth = 2;
  const northA = point(0, 0, WALL_HEIGHT);
  const northB = point(ROOM_W, 0, WALL_HEIGHT);
  const westB = point(0, ROOM_H, WALL_HEIGHT);
  ctx.beginPath();
  ctx.moveTo(northA.x, northA.y);
  ctx.lineTo(northB.x, northB.y);
  ctx.moveTo(northA.x, northA.y);
  ctx.lineTo(westB.x, westB.y);
  ctx.stroke();
}

export function drawWindows(ctx: CanvasRenderingContext2D) {
  for (const x of [5, 11, 17, 23]) {
    fill(ctx, [point(x - 2, 0, 92), point(x + 2, 0, 92), point(x + 2, 0, 48), point(x - 2, 0, 48)], "#4d5967");
    fill(ctx, [point(x - 1.78, 0, 86), point(x + 1.78, 0, 86), point(x + 1.78, 0, 53), point(x - 1.78, 0, 53)], "#a6d6e1");
    for (const line of [-0.6, 0.6]) {
      fill(ctx, [point(x + line - 0.06, 0, 86), point(x + line + 0.06, 0, 86), point(x + line + 0.06, 0, 53), point(x + line - 0.06, 0, 53)], "#e8f2ef");
    }
    fill(ctx, [point(x - 1.78, 0, 69), point(x + 1.78, 0, 69), point(x + 1.78, 0, 67), point(x - 1.78, 0, 67)], "#e8f2ef");
  }
}

export function drawLighting(ctx: CanvasRenderingContext2D) {
  for (const x of [4, 14, 24]) {
    const a = point(x, 0, WALL_HEIGHT + 22);
    const b = point(x + 2.8, 0, WALL_HEIGHT + 22);
    ctx.strokeStyle = "#2c3945";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y - 32);
    ctx.lineTo(a.x, a.y);
    ctx.moveTo(b.x, b.y - 32);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    fill(ctx, [point(x, 0, WALL_HEIGHT + 22), point(x + 2.8, 0, WALL_HEIGHT + 22), point(x + 2.45, 0, WALL_HEIGHT + 15), point(x + 0.35, 0, WALL_HEIGHT + 15)], "#b7c2c3");
    fill(ctx, [point(x + 0.35, 0, WALL_HEIGHT + 16), point(x + 2.45, 0, WALL_HEIGHT + 16), point(x + 2.3, 0, WALL_HEIGHT + 14), point(x + 0.5, 0, WALL_HEIGHT + 14)], "#fff4c9");
  }
}

export function spriteKey(item: OfficeItem): string | undefined {
  // The paired desk assets are opposite sides of the same object (180 degrees apart).
  const oppositeSide = (item.rotation ?? 0) >= 2;
  if (item.type === "desk") {
    if (item.variant === "reception" || item.id.includes("reception")) return oppositeSide ? "receptionDeskBack" : "receptionDesk";
    if (item.variant === "laptop" || item.id.includes("laptop")) return oppositeSide ? "deskLaptopBack" : "deskLaptop";
    return oppositeSide ? "deskBack" : "desk";
  }
  if (item.type === "table") return item.id.includes("meeting") ? "meetingTable" : "table";
  if (item.type === "chair") return item.variant === "back" || oppositeSide ? "chairBack" : "chair";
  if (item.type === "meetingChair") return "meetingChair";
  if (item.type === "sofa") return "sofa";
  if (item.type === "cabinet") return "cabinet";
  if (item.type === "printer") return "printer";
  if (item.type === "plant") return item.id.includes("corner") ? "plant" : "plant";
  if (item.type === "partition") return "partition";
  if (item.type === "water") return "water";
  if (item.type === "coffee") return "coffee";
  if (item.type === "whiteboard") return "whiteboard";
  if (item.type === "wall1") return "wall1";
  if (item.type === "wall2") return "wall2";
  if (item.type === "catMale") return item.variant === "back" ? "catMaleSeatedBack" : "catMaleSeated";
  if (item.type === "catFemale") return item.variant === "back" ? "catFemaleSeatedBack" : "catFemaleSeated";
  return undefined;
}

export function drawSprite(ctx: CanvasRenderingContext2D, item: OfficeItem, sprites: Map<string, Sprite>, time = 0, topOnly = false) {
  const key = spriteKey(item);
  if (!key) return;
  const sprite = sprites.get(key);
  if (!sprite) return;
  const p = point(item.x, item.y);
  const width = sprite.width * sprite.scale;
  const height = sprite.height * sprite.scale;
  const frame = sprite.frames ? sprite.frames[Math.floor(time / 180) % sprite.frames.length] : sprite.canvas;
  const flipHorizontal = (item.rotation ?? 0) % 2 === 1;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (flipHorizontal) ctx.scale(-1, 1);
  if (topOnly) {
    ctx.beginPath();
    ctx.rect(-width / 2 - 1, -height - 1, width + 2, height * 0.42);
    ctx.clip();
  }
  ctx.drawImage(frame, -width / 2, -height, width, height);
  ctx.restore();
}

const PREVIEW_CAT: OfficeItem = {
  id: "preview-cat",
  type: "catMale",
  x: 14,
  y: 10,
  w: 0.9,
  d: 0.9,
  rotation: 0
};

function deskSeat(item: OfficeItem) {
  const depth = item.d ?? 1.25;
  return {
    x: Math.round(item.x),
    y: Math.round(item.y + depth + 1)
  };
}

function isDoubleDesk(item: OfficeItem | undefined) {
  if (!item) return false;
  return item.variant !== "laptop" && !item.id.includes("reception");
}

export default function WorldRoom({ theme }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [size, setSize] = useState({ width: 1000, height: 720 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [sprites, setSprites] = useState<Map<string, Sprite>>(new Map());
  const [roomLayout, setRoomLayout] = useState<OfficeLayout>(() => readSavedLayout());

  useEffect(() => {
    const refresh = () => setRoomLayout(readSavedLayout());
    window.addEventListener("pixel-office-world-layout", refresh);
    return () => window.removeEventListener("pixel-office-world-layout", refresh);
  }, []);

  const room = useMemo(() => {
    const minX = -ROOM_H * (TILE_W / 2);
    const maxX = ROOM_W * (TILE_W / 2);
    const minY = -WALL_HEIGHT - 40;
    const maxY = (ROOM_W + ROOM_H) * (TILE_H / 2);
    const width = maxX - minX;
    const height = maxY - minY;
    return {
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      base: Math.min((size.width - 48) / width, (size.height - 48) / height)
    };
  }, [size]);

  useEffect(() => {
    let active = true;
    loadSpriteCatalog().then((catalog) => {
      if (!active) return;
      setSprites(catalog);
    }).catch(() => setSprites(new Map()));
    return () => {
      active = false;
    };
  }, []);

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
    if (!canvas || sprites.size === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    ctx.imageSmoothingEnabled = false;
    let frame = 0;
    const draw = (time: number) => {
      const scale = room.base * zoom;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = theme === "esmeralda" ? "#dbeae5" : "#d9e0e6";
      ctx.fillRect(0, 0, size.width, size.height);
      ctx.save();
      ctx.translate(size.width / 2 + pan.x, size.height / 2 + pan.y);
      ctx.scale(scale, scale);
      ctx.translate(-room.centerX, -room.centerY);
      drawFloor(ctx);
      drawWalls(ctx);
      drawWindows(ctx);
      drawLighting(ctx);
      const items = [...roomLayout.items].sort((a, b) => a.y - b.y);
      const desk = roomLayout.items
        .filter((item) => item.type === "desk")
        .sort((a, b) => Math.hypot(a.x - ROOM_W / 2, a.y - ROOM_H / 2) - Math.hypot(b.x - ROOM_W / 2, b.y - ROOM_H / 2))[0];
      const seat = desk ? deskSeat(desk) : { x: PREVIEW_CAT.x, y: PREVIEW_CAT.y };
      const targetChair = roomLayout.items
        .filter((item) => item.type === "chair")
        .sort((a, b) => Math.hypot(a.x - seat.x, a.y - seat.y) - Math.hypot(b.x - seat.x, b.y - seat.y))[0];
      const cat = {
        ...PREVIEW_CAT,
        variant: isDoubleDesk(desk) ? "back" : undefined,
        rotation: 0 as const,
        x: targetChair?.x ?? seat.x,
        y: (targetChair?.y ?? seat.y) - 0.8
      };
      for (const item of items) {
        if (item.type === "chair") drawSprite(ctx, item, sprites);
      }
      for (const item of items) {
        if (item.type !== "chair") drawSprite(ctx, item, sprites);
      }
      drawSprite(ctx, cat, sprites);
      for (const item of items) {
        if (item.type === "chair") drawSprite(ctx, item, sprites, 0, true);
      }
      ctx.restore();
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [pan, room, roomLayout, size, sprites, theme, zoom]);

  function zoomAt(nextZoom: number, clientX: number, clientY: number) {
    const bounds = wrapRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const next = Math.max(0.55, Math.min(2.6, nextZoom));
    const px = clientX - bounds.left;
    const py = clientY - bounds.top;
    const oldScale = room.base * zoom;
    const nextScale = room.base * next;
    const worldX = (px - size.width / 2 - pan.x) / oldScale + room.centerX;
    const worldY = (py - size.height / 2 - pan.y) / oldScale + room.centerY;
    setPan({
      x: px - size.width / 2 - (worldX - room.centerX) * nextScale,
      y: py - size.height / 2 - (worldY - room.centerY) * nextScale
    });
    setZoom(next);
  }

  return (
    <div
      ref={wrapRef}
      className="iso-room"
      onWheel={(event) => {
        event.preventDefault();
        zoomAt(zoom - event.deltaY * 0.001, event.clientX, event.clientY);
      }}
      onMouseMove={(event) => {
        const drag = dragRef.current;
        if (!drag) return;
        setPan({ x: drag.panX + event.clientX - drag.x, y: drag.panY + event.clientY - drag.y });
      }}
      onMouseDown={(event) => {
        dragRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
      }}
      onMouseUp={() => {
        dragRef.current = null;
      }}
      onMouseLeave={() => {
        dragRef.current = null;
      }}
    >
      <canvas ref={canvasRef} />
      <div className="iso-controls">
        <button type="button" className="pill" onClick={() => zoomAt(zoom - 0.15, size.width / 2, size.height / 2)}>−</button>
        <button type="button" className="pill" onClick={() => zoomAt(zoom + 0.15, size.width / 2, size.height / 2)}>+</button>
        <button type="button" className="pill" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>AJUSTAR</button>
      </div>
      <div className="iso-caption">
        <b>Oficina central</b>
        <span>Construida por código · atlas de muebles · {theme.toUpperCase()}</span>
      </div>
    </div>
  );
}
