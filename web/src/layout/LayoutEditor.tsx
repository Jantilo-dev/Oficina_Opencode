import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { fetchLayout, saveLayout as putLayout } from "../api";

type PieceKind =
  | "area"
  | "office"
  | "kitchen"
  | "meeting"
  | "bathroom"
  | "reception"
  | "entrance"
  | "path"
  | "wall"
  | "door";

type PathShape = "straight" | "corner" | "t" | "cross";

type Piece = {
  id: string;
  kind: PieceKind;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  shape?: PathShape;
  doorSide?: number;
};

type Layout = { version: 1; width: number; height: number; pieces: Piece[] };
type View = { zoom: number; x: number; y: number };
type Size = { w: number; h: number };

const DEFAULT_WIDTH = 2400;
const DEFAULT_HEIGHT = 1600;
const GRID = 20;
const STORAGE_KEY = "pixel-office-layout-v1";

const DEFAULTS: Record<PieceKind, { w: number; h: number; label: string }> = {
  area: { w: 520, h: 420, label: "Área · 5 puestos" },
  office: { w: 520, h: 260, label: "Oficina · 2 puestos" },
  kitchen: { w: 520, h: 320, label: "Cocina" },
  meeting: { w: 520, h: 320, label: "Reuniones" },
  bathroom: { w: 420, h: 440, label: "Baño" },
  reception: { w: 300, h: 200, label: "Recepción" },
  entrance: { w: 100, h: 220, label: "Entrada" },
  path: { w: 160, h: 40, label: "Pasillo" },
  wall: { w: 160, h: 20, label: "Muro" },
  door: { w: 80, h: 20, label: "Puerta" }
};

const PATH_LABELS: Record<PathShape, string> = {
  straight: "Recto",
  corner: "Esquina",
  t: "T",
  cross: "Cruz"
};

function newId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function pathSize(shape: PathShape) {
  return shape === "straight" ? { w: 160, h: 40 } : { w: 160, h: 80 };
}

function exampleLayout(): Layout {
  const pieces: Piece[] = [
    { id: newId(), kind: "area", x: 80, y: 80, w: 520, h: 420, rotation: 0 },
    { id: newId(), kind: "area", x: 680, y: 80, w: 520, h: 420, rotation: 0 },
    { id: newId(), kind: "area", x: 80, y: 560, w: 520, h: 420, rotation: 0 },
    { id: newId(), kind: "area", x: 680, y: 560, w: 520, h: 420, rotation: 0 },
    { id: newId(), kind: "path", x: 600, y: 120, w: 40, h: 160, rotation: 1, shape: "straight" },
    { id: newId(), kind: "path", x: 120, y: 500, w: 160, h: 40, rotation: 0, shape: "straight" },
    { id: newId(), kind: "kitchen", x: 1300, y: 80, w: 520, h: 320, rotation: 0 },
    { id: newId(), kind: "meeting", x: 1300, y: 460, w: 520, h: 320, rotation: 0 },
    { id: newId(), kind: "bathroom", x: 1900, y: 80, w: 420, h: 440, rotation: 0 },
    { id: newId(), kind: "reception", x: 1900, y: 600, w: 300, h: 200, rotation: 0 },
    { id: newId(), kind: "entrance", x: 2260, y: 600, w: 100, h: 220, rotation: 0 },
    { id: newId(), kind: "office", x: 80, y: 1040, w: 520, h: 260, rotation: 0 },
    { id: newId(), kind: "office", x: 680, y: 1040, w: 520, h: 260, rotation: 0 },
    { id: newId(), kind: "office", x: 1280, y: 1040, w: 520, h: 260, rotation: 0 },
    { id: newId(), kind: "office", x: 80, y: 1320, w: 520, h: 260, rotation: 0 },
    { id: newId(), kind: "office", x: 680, y: 1320, w: 520, h: 260, rotation: 0 },
    { id: newId(), kind: "office", x: 1280, y: 1320, w: 520, h: 260, rotation: 0 }
  ];
  return { version: 1, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT, pieces };
}

function normalizeLayout(value: unknown): Layout | null {
  if (!value || typeof value !== "object") return null;
  const parsed = value as Partial<Layout>;
  if (!Array.isArray(parsed.pieces)) return null;
  const pieces = parsed.pieces.filter(
    (piece): piece is Piece =>
      Boolean(
        piece &&
          typeof piece === "object" &&
          typeof (piece as Piece).id === "string" &&
          typeof (piece as Piece).kind === "string" &&
          Number.isFinite((piece as Piece).x) &&
          Number.isFinite((piece as Piece).y) &&
          Number.isFinite((piece as Piece).w) &&
          Number.isFinite((piece as Piece).h)
      )
  );
  return {
    version: 1,
    width: Number(parsed.width) || DEFAULT_WIDTH,
    height: Number(parsed.height) || DEFAULT_HEIGHT,
    pieces
  };
}


function fitView(size: Size, layout: Layout): View {
  const zoom = Math.max(
    0.15,
    Math.min(1.2, (size.w - 36) / layout.width, (size.h - 36) / layout.height)
  );
  return {
    zoom,
    x: (size.w - layout.width * zoom) / 2,
    y: (size.h - layout.height * zoom) / 2
  };
}

function wallRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "#d7dde6";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#ffffff88";
  if (w >= h) ctx.fillRect(x, y, w, 2);
  else ctx.fillRect(x, y, 2, h);
  ctx.fillStyle = "#7d8794";
  if (w >= h) ctx.fillRect(x, y + h - 2, w, 2);
  else ctx.fillRect(x + w - 2, y, 2, h);
}

function drawRoomShell(
  ctx: CanvasRenderingContext2D,
  p: Piece,
  floor: string,
  label: string,
  door = true
) {
  const { x, y, w, h } = p;
  const t = 8;
  const gap = 80;
  const side = p.doorSide ?? 0;
  ctx.fillStyle = floor;
  ctx.fillRect(x, y, w, h);
  const gapX = x + (w - gap) / 2;
  const gapY = y + (h - gap) / 2;
  if (door && side === 3) {
    wallRect(ctx, x, y, gapX - x, t);
    wallRect(ctx, gapX + gap, y, x + w - (gapX + gap), t);
  } else {
    wallRect(ctx, x, y, w, t);
  }
  if (door && side === 1) {
    wallRect(ctx, x, y + h - t, gapX - x, t);
    wallRect(ctx, gapX + gap, y + h - t, x + w - (gapX + gap), t);
  } else {
    wallRect(ctx, x, y + h - t, w, t);
  }
  if (door && side === 2) {
    wallRect(ctx, x, y, t, gapY - y);
    wallRect(ctx, x, gapY + gap, t, y + h - (gapY + gap));
  } else {
    wallRect(ctx, x, y, t, h);
  }
  if (door && side === 0) {
    wallRect(ctx, x + w - t, y, t, gapY - y);
    wallRect(ctx, x + w - t, gapY + gap, t, y + h - (gapY + gap));
  } else {
    wallRect(ctx, x + w - t, y, t, h);
  }
  if (door) {
    ctx.fillStyle = "#c9a071";
    if (side === 0 || side === 2) {
      const dx = side === 0 ? x + w - t : x;
      ctx.fillRect(dx - 2, gapY, t + 4, 4);
      ctx.fillRect(dx - 2, gapY + gap - 4, t + 4, 4);
    } else {
      const dy = side === 1 ? y + h - t : y;
      ctx.fillRect(gapX, dy - 2, 4, t + 4);
      ctx.fillRect(gapX + gap - 4, dy - 2, 4, t + 4);
    }
  }
  ctx.fillStyle = "#1b2f4d";
  ctx.font = "bold 14px ui-monospace, Consolas, monospace";
  ctx.textAlign = "left";
  ctx.fillText(label, x + 16, y + 25);
}

function drawDesk(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string
) {
  ctx.fillStyle = "#2b4f7a";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#8fb6dc";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = "#d9a35f";
  ctx.fillRect(x + w * 0.1, y + h * 0.52, w * 0.8, h * 0.26);
  ctx.fillStyle = "#c9d4df";
  ctx.fillRect(x + w * 0.22, y + h * 0.28, w * 0.24, h * 0.17);
  ctx.fillStyle = "#efe6d4";
  ctx.font = "10px ui-monospace, Consolas, monospace";
  ctx.textAlign = "center";
  ctx.fillText(label, x + w / 2, y - 5);
}

function drawAisle(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  if (w <= 0 || h <= 0) return;
  ctx.fillStyle = "#e6e9ee";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#aeb7c4";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = "#cfd5dd";
  if (w >= h) ctx.fillRect(x, y + h / 2, w, 1);
  else ctx.fillRect(x + w / 2, y, 1, h);
}

function drawArea(ctx: CanvasRenderingContext2D, p: Piece) {
  drawRoomShell(ctx, p, "#3f72b2", "ÁREA · 5 PUESTOS");
  const x = p.x;
  const y = p.y;
  drawAisle(ctx, x + 20, y + 190, p.w - 40, 50);
  drawAisle(ctx, x, y + 240, 60, p.h - 240);
  drawAisle(ctx, x + 230, y + 240, 60, p.h - 240);
  drawAisle(ctx, x + p.w - 60, y + 240, 60, p.h - 240);
  drawAisle(ctx, x, y + p.h - 20, p.w, 20);
  const top = ["JEFE", "FRONTEND", "BACKEND"];
  const bottom = ["QA", "DOCUMENTACIÓN"];
  top.forEach((label, i) => drawDesk(ctx, x + 30 + i * 160, y + 60, 150, 130, label));
  bottom.forEach((label, i) => drawDesk(ctx, x + 70 + i * 220, y + 240, 160, 130, label));
}

function drawOffice(ctx: CanvasRenderingContext2D, p: Piece) {
  drawRoomShell(ctx, p, "#3f72b2", "OFICINA · 2 PUESTOS");
  drawAisle(ctx, p.x, p.y + p.h - 20, p.w, 20);
  drawDesk(ctx, p.x + 45, p.y + 60, 190, 150, "PUESTO 1");
  drawDesk(ctx, p.x + 285, p.y + 60, 190, 150, "PUESTO 2");
}

function drawKitchen(ctx: CanvasRenderingContext2D, p: Piece) {
  drawRoomShell(ctx, p, "#eef1f5", "COCINA");
  ctx.fillStyle = "#b98b57";
  ctx.fillRect(p.x + 20, p.y + 36, p.w - 40, 24);
  ctx.fillStyle = "#d9a35f";
  ctx.fillRect(p.x + 24, p.y + 40, p.w - 48, 12);
  ctx.fillStyle = "#2b3440";
  ctx.fillRect(p.x + p.w - 80, p.y + 36, 42, 60);
  ctx.fillStyle = "#f4e8cc";
  ctx.fillRect(p.x + 90, p.y + 130, 220, 70);
  ctx.fillStyle = "#c9a071";
  ctx.fillRect(p.x + 94, p.y + 134, 212, 58);
}

function drawMeeting(ctx: CanvasRenderingContext2D, p: Piece) {
  drawRoomShell(ctx, p, "#e9edf2", "REUNIONES");
  ctx.fillStyle = "#c9a071";
  ctx.fillRect(p.x + 100, p.y + 110, 320, 90);
  ctx.fillStyle = "#e0b980";
  ctx.fillRect(p.x + 104, p.y + 114, 312, 82);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = "#3b4657";
    ctx.fillRect(p.x + 120 + i * 105, p.y + 80, 34, 20);
    ctx.fillRect(p.x + 120 + i * 105, p.y + 210, 34, 20);
  }
}

function drawBathroom(ctx: CanvasRenderingContext2D, p: Piece) {
  drawRoomShell(ctx, p, "#e3e7ec", "BAÑO");
  ctx.strokeStyle = "#cfd5dd";
  ctx.lineWidth = 1;
  for (let x = p.x + 40; x < p.x + p.w; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, p.y);
    ctx.lineTo(x, p.y + p.h);
    ctx.stroke();
  }
  for (let y = p.y + 40; y < p.y + p.h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(p.x, y);
    ctx.lineTo(p.x + p.w, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#d7dde6";
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(p.x + 40 + i * 100, p.y + 60, 70, 90);
    ctx.fillRect(p.x + 40 + i * 100, p.y + 250, 70, 90);
  }
}

function drawReception(ctx: CanvasRenderingContext2D, p: Piece) {
  drawRoomShell(ctx, p, "#f4e8cc", "RECEPCIÓN");
  ctx.fillStyle = "#b98b57";
  ctx.fillRect(p.x + 50, p.y + 90, 180, 50);
  ctx.fillStyle = "#d9a35f";
  ctx.fillRect(p.x + 54, p.y + 94, 172, 12);
  ctx.fillStyle = "#3a414d";
  ctx.fillRect(p.x + 18, p.y + 46, 44, 30);
}

function drawEntrance(ctx: CanvasRenderingContext2D, p: Piece) {
  drawRoomShell(ctx, p, "#dfe7f0", "ENTRADA", false);
  ctx.fillStyle = "#c9a071";
  ctx.fillRect(p.x + 20, p.y + 20, p.w - 40, p.h - 40);
  ctx.fillStyle = "#8a5a3b";
  ctx.fillRect(p.x + 28, p.y + 28, p.w - 56, p.h - 56);
}

function drawPath(ctx: CanvasRenderingContext2D, p: Piece) {
  const { x, y, w, h } = p;
  ctx.fillStyle = "#e6e9ee";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#aeb7c4";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = "#cfd5dd";
  if (p.shape === "corner") {
    ctx.fillRect(x, y + h / 2 - 1, w / 2, 2);
    ctx.fillRect(x + w / 2 - 1, y, 2, h / 2);
  } else if (p.shape === "t" || p.shape === "cross") {
    ctx.fillRect(x, y + h / 2 - 1, w, 2);
    ctx.fillRect(x + w / 2 - 1, y, 2, h);
  } else if (w >= h) {
    ctx.fillRect(x, y + h / 2 - 1, w, 2);
  } else {
    ctx.fillRect(x + w / 2 - 1, y, 2, h);
  }
}

function drawPiece(ctx: CanvasRenderingContext2D, p: Piece) {
  if (p.kind === "area") return drawArea(ctx, p);
  if (p.kind === "office") return drawOffice(ctx, p);
  if (p.kind === "kitchen") return drawKitchen(ctx, p);
  if (p.kind === "meeting") return drawMeeting(ctx, p);
  if (p.kind === "bathroom") return drawBathroom(ctx, p);
  if (p.kind === "reception") return drawReception(ctx, p);
  if (p.kind === "entrance") return drawEntrance(ctx, p);
  if (p.kind === "path") return drawPath(ctx, p);
  if (p.kind === "wall") {
    wallRect(ctx, p.x, p.y, p.w, p.h);
    return;
  }
  ctx.fillStyle = "#c9a071";
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.fillStyle = "#8a5a3b";
  ctx.fillRect(p.x + 4, p.y + 4, p.w - 8, p.h - 8);
}

type Props = { onClose: () => void };

export default function LayoutEditor({ onClose }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const saveTimer = useRef<number | null>(null);
  const hasLocalRef = useRef(false);
  const [layout, setLayout] = useState<Layout>(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    hasLocalRef.current = Boolean(raw);
    if (!raw) return exampleLayout();
    try {
      return normalizeLayout(JSON.parse(raw)) ?? exampleLayout();
    } catch {
      return exampleLayout();
    }
  });
  const [savedAt, setSavedAt] = useState<string>("");
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });
  const [view, setView] = useState<View>({ zoom: 0.5, x: 0, y: 0 });
  const [selected, setSelected] = useState<string | null>(null);
  const [placing, setPlacing] = useState<{ kind: PieceKind; shape?: PathShape } | null>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [pan, setPan] = useState<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const update = () => {
      const rect = stage.getBoundingClientRect();
      setSize({ w: Math.max(300, Math.floor(rect.width)), h: Math.max(240, Math.floor(rect.height)) });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (size.w > 0 && size.h > 0) setView(fitView(size, layout));
  }, [size.w, size.h]);

  useEffect(() => {
    if (hasLocalRef.current) return;
    let alive = true;
    void fetchLayout()
      .then((value) => {
        const loaded = normalizeLayout(value);
        if (!alive || !loaded) return;
        if (loaded.pieces.length === 0 && layout.pieces.length > 0) return;
        setLayout(loaded);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
        setSavedAt(new Date().toLocaleTimeString());
        setMessage("Layout cargado del servidor.");
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(
    () => () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    },
    []
  );
  const commit = (next: Layout) => {
    setLayout(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSavedAt(new Date().toLocaleTimeString());
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void putLayout(next).catch(() => {});
    }, 500);
  };

  const snap = (value: number) => Math.round(value / GRID) * GRID;

  const overlaps = (a: Piece, b: Piece) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  const fits = (piece: Piece) => {
    if (piece.x < 0 || piece.y < 0) return false;
    if (piece.x + piece.w > layout.width || piece.y + piece.h > layout.height) return false;
    return !layout.pieces.some((other) => other.id !== piece.id && overlaps(piece, other));
  };

  const alignToPieces = (piece: Piece, rawX: number, rawY: number) => {
    let x = snap(rawX);
    let y = snap(rawY);
    let bestX = GRID + 1;
    let bestY = GRID + 1;
    for (const other of layout.pieces) {
      if (other.id === piece.id) continue;
      for (const candidate of [
        other.x,
        other.x + other.w,
        other.x - piece.w,
        other.x + other.w - piece.w
      ]) {
        const distance = Math.abs(candidate - rawX);
        if (distance <= GRID && distance < bestX) {
          bestX = distance;
          x = candidate;
        }
      }
      for (const candidate of [
        other.y,
        other.y + other.h,
        other.y - piece.h,
        other.y + other.h - piece.h
      ]) {
        const distance = Math.abs(candidate - rawY);
        if (distance <= GRID && distance < bestY) {
          bestY = distance;
          y = candidate;
        }
      }
    }
    return {
      x: Math.max(0, Math.min(layout.width - piece.w, x)),
      y: Math.max(0, Math.min(layout.height - piece.h, y))
    };
  };

  const addPiece = (kind: PieceKind, wx: number, wy: number, shape?: PathShape) => {
    const dims = kind === "path" && shape ? pathSize(shape) : DEFAULTS[kind];
    const piece: Piece = {
      id: newId(),
      kind,
      x: 0,
      y: 0,
      w: dims.w,
      h: dims.h,
      rotation: 0,
      shape
    };
    const position = alignToPieces(piece, wx - dims.w / 2, wy - dims.h / 2);
    piece.x = position.x;
    piece.y = position.y;
    if (!fits(piece)) {
      setMessage("No hay hueco ahí. Mueve el lienzo o amplía la oficina.");
      return;
    }
    commit({ ...layout, pieces: [...layout.pieces, piece] });
    setSelected(piece.id);
    setPlacing(null);
    setMessage("Pieza colocada.");
  };

  const worldPoint = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left - view.x) / view.zoom,
      y: (event.clientY - rect.top - view.y) / view.zoom
    };
  };

  const hit = (x: number, y: number) =>
    [...layout.pieces]
      .reverse()
      .find((piece) => x >= piece.x && x <= piece.x + piece.w && y >= piece.y && y <= piece.y + piece.h);

  const onDown = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (event.button === 1 || event.button === 2) {
      event.preventDefault();
      setPan({ sx: event.clientX, sy: event.clientY, ox: view.x, oy: view.y });
      return;
    }
    if (event.button !== 0) return;
    const p = worldPoint(event);
    if (placing) {
      addPiece(placing.kind, p.x, p.y, placing.shape);
      return;
    }
    const piece = hit(p.x, p.y);
    if (!piece) {
      setSelected(null);
      setPan({ sx: event.clientX, sy: event.clientY, ox: view.x, oy: view.y });
      return;
    }
    setSelected(piece.id);
    setDrag({ id: piece.id, dx: p.x - piece.x, dy: p.y - piece.y });
  };

  const onMove = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (pan) {
      setView((current) => ({
        ...current,
        x: pan.ox + event.clientX - pan.sx,
        y: pan.oy + event.clientY - pan.sy
      }));
      return;
    }
    if (!drag) return;
    const p = worldPoint(event);
    const piece = layout.pieces.find((item) => item.id === drag.id);
    if (!piece) return;
    const position = alignToPieces(piece, p.x - drag.dx, p.y - drag.dy);
    const candidate = { ...piece, x: position.x, y: position.y };
    if (!fits(candidate)) {
      setMessage("Ese espacio está ocupado.");
      return;
    }
    commit({
      ...layout,
      pieces: layout.pieces.map((item) => (item.id === piece.id ? candidate : item))
    });
  };

  const endPointer = () => {
    setDrag(null);
    setPan(null);
  };

  const rotate = () => {
    if (!selected) return;
    const piece = layout.pieces.find((item) => item.id === selected);
    if (!piece) return;
    if (!["path", "wall", "door"].includes(piece.kind)) {
      const doorSide = ((piece.doorSide ?? 0) + 1) % 4;
      commit({
        ...layout,
        pieces: layout.pieces.map((item) =>
          item.id === selected ? { ...item, rotation: doorSide, doorSide } : item
        )
      });
      setMessage(`Puerta al ${["derecha", "abajo", "izquierda", "arriba"][doorSide]}.`);
      return;
    }
    const candidate = { ...piece, rotation: (piece.rotation + 1) % 4, w: piece.h, h: piece.w };
    if (!fits(candidate)) {
      setMessage("No cabe al rotar: ese espacio está ocupado.");
      return;
    }
    commit({
      ...layout,
      pieces: layout.pieces.map((item) => (item.id === selected ? candidate : item))
    });
  };

  const remove = () => {
    if (!selected) return;
    commit({ ...layout, pieces: layout.pieces.filter((piece) => piece.id !== selected) });
    setSelected(null);
  };

  const nudge = (dx: number, dy: number) => {
    if (!selected) return;
    const piece = layout.pieces.find((item) => item.id === selected);
    if (!piece) return;
    const candidate = {
      ...piece,
      x: Math.max(0, Math.min(layout.width - piece.w, piece.x + dx * GRID)),
      y: Math.max(0, Math.min(layout.height - piece.h, piece.y + dy * GRID))
    };
    if (!fits(candidate)) {
      setMessage("Ese espacio está ocupado.");
      return;
    }
    commit({
      ...layout,
      pieces: layout.pieces.map((item) => (item.id === selected ? candidate : item))
    });
  };

  const expand = (dw: number, dh: number) => {
    commit({ ...layout, width: layout.width + dw, height: layout.height + dh });
    setMessage(`Lienzo ampliado a ${layout.width + dw} × ${layout.height + dh}.`);
  };

  const zoomAt = (factor: number, px: number, py: number) => {
    setView((current) => {
      const zoom = Math.max(0.1, Math.min(2.5, current.zoom * factor));
      const wx = (px - current.x) / current.zoom;
      const wy = (py - current.y) / current.zoom;
      return { zoom, x: px - wx * zoom, y: py - wy * zoom };
    });
  };

  const save = async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    setSavedAt(new Date().toLocaleTimeString());
    try {
      await putLayout(layout);
      setMessage("Layout guardado en el servidor y en este navegador.");
    } catch {
      setMessage("Guardado en este navegador; el servidor no respondió.");
    }
  };

  const closeEditor = () => {
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
      void putLayout(layout).catch(() => {});
    }
    onClose();
  };
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(layout, null, 2)], {
      type: "application/json;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pixel-office-layout.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Partial<Layout>;
      if (!Array.isArray(parsed.pieces)) throw new Error("JSON sin pieces");
      commit({
        version: 1,
        width: Number(parsed.width) || DEFAULT_WIDTH,
        height: Number(parsed.height) || DEFAULT_HEIGHT,
        pieces: parsed.pieces
      });
      setSelected(null);
      setMessage("Layout importado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas || size.w === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);
    ctx.fillStyle = "#0f1722";
    ctx.fillRect(0, 0, size.w, size.h);
    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.scale(view.zoom, view.zoom);

    ctx.fillStyle = "#1f2937";
    ctx.fillRect(0, 0, layout.width, layout.height);
    ctx.strokeStyle = "#ffffff10";
    ctx.lineWidth = 1;
    for (let x = 0; x <= layout.width; x += GRID) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, layout.height);
      ctx.stroke();
    }
    for (let y = 0; y <= layout.height; y += GRID) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(layout.width, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "#8fb6dc";
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, layout.width, layout.height);

    for (const piece of layout.pieces) drawPiece(ctx, piece);
    if (selected) {
      const piece = layout.pieces.find((item) => item.id === selected);
      if (piece) {
        ctx.strokeStyle = "#ffd34d";
        ctx.lineWidth = 4 / view.zoom;
        ctx.setLineDash([10 / view.zoom, 6 / view.zoom]);
        ctx.strokeRect(piece.x - 4, piece.y - 4, piece.w + 8, piece.h + 8);
        ctx.setLineDash([]);
      }
    }
    ctx.restore();
  };

  useEffect(draw, [layout, selected, view, size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      zoomAt(event.deltaY < 0 ? 1.12 : 1 / 1.12, event.clientX - rect.left, event.clientY - rect.top);
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [size.w, size.h, view.zoom, view.x, view.y]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeEditor();
      if (event.key === "Delete" || event.key === "Backspace") remove();
      if (event.key.toLowerCase() === "r") rotate();
      if (event.key === "ArrowLeft") nudge(-1, 0);
      if (event.key === "ArrowRight") nudge(1, 0);
      if (event.key === "ArrowUp") nudge(0, -1);
      if (event.key === "ArrowDown") nudge(0, 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, layout]);

  const paletteButton = (kind: PieceKind, label: string, shape?: PathShape) => (
    <button
      key={`${kind}-${shape ?? "plain"}`}
      type="button"
      className={`layout-palette-btn ${placing?.kind === kind && placing.shape === shape ? "on" : ""}`}
      onClick={() => setPlacing({ kind, shape })}
    >
      {label}
    </button>
  );

  return (
    <div className="layout-backdrop">
      <div className="layout-shell">
        <header className="layout-head">
          <h2>EDITOR DE OFICINA · ROMPECABEZAS</h2>
          <div className="layout-actions">
            <button type="button" className="btn ghost" onClick={save}>
              Guardar
            </button>
            <button type="button" className="btn ghost" onClick={exportJson}>
              Exportar JSON
            </button>
            <label className="btn ghost">
              Importar
              <input
                type="file"
                accept="application/json"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importJson(file);
                }}
              />
            </label>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                if (!window.confirm("¿Vaciar el lienzo?")) return;
                commit({ ...layout, pieces: [] });
                setSelected(null);
              }}
            >
              Vaciar
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                commit(exampleLayout());
                setSelected(null);
              }}
            >
              Ejemplo
            </button>
            <button type="button" className="btn ghost danger" onClick={remove} disabled={!selected}>
              Borrar
            </button>
            <button type="button" className="btn ghost" onClick={rotate}>
              Rotar
            </button>
            <button type="button" className="btn ghost" onClick={() => expand(600, 0)}>
              + Ancho
            </button>
            <button type="button" className="btn ghost" onClick={() => expand(0, 400)}>
              + Alto
            </button>
            <button type="button" className="btn ghost" onClick={() => setView(fitView(size, layout))}>
              Ajustar
            </button>
            <button type="button" className="btn primary" onClick={closeEditor}>
              Cerrar
            </button>
          </div>
        </header>

        <div className="layout-body">
          <aside className="layout-palette">
            <h3>Áreas</h3>
            {paletteButton("area", "Área · 5 puestos")}
            {paletteButton("office", "Oficina · 2 puestos")}
            <h3>Servicios</h3>
            {paletteButton("kitchen", "Cocina")}
            {paletteButton("meeting", "Reuniones")}
            {paletteButton("bathroom", "Baño")}
            {paletteButton("reception", "Recepción")}
            {paletteButton("entrance", "Entrada")}
            <h3>Pasillos</h3>
            {(Object.keys(PATH_LABELS) as PathShape[]).map((shape) =>
              paletteButton("path", `Pasillo · ${PATH_LABELS[shape]}`, shape)
            )}
            <h3>Muros</h3>
            {paletteButton("wall", "Muro")}
            {paletteButton("door", "Puerta")}
          </aside>

          <div className="layout-stage" ref={stageRef}>
            <div className="layout-hint">
              {placing
                ? `Clic para colocar: ${DEFAULTS[placing.kind].label}`
                : "Clic: colocar/seleccionar · Arrastrar pieza: mover · Arrastrar vacío/botón derecho: mover lienzo · Rueda: zoom · R: puerta/rotar · Supr: borrar"}
            </div>
            {layout.pieces.length === 0 && (
              <div className="layout-empty">
                <b>Lienzo vacío</b>
                <span>Elige una pieza de la izquierda y haz clic en el lienzo.</span>
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => {
                    commit(exampleLayout());
                    setSelected(null);
                    setMessage("Ejemplo cargado.");
                  }}
                >
                  Cargar ejemplo
                </button>
              </div>
            )}            <canvas
              ref={canvasRef}
              className="layout-canvas"
              onMouseDown={onDown}
              onMouseMove={onMove}
              onMouseUp={endPointer}
              onMouseLeave={endPointer}
              onContextMenu={(event) => event.preventDefault()}
            />
          </div>
        </div>

        <footer className="layout-foot">
          <span>{layout.pieces.length} piezas</span>
          <span>
            {layout.width} × {layout.height}
          </span>
          <span>{Math.round(view.zoom * 100)}%</span>
          {selected && (
            <span>
              x {layout.pieces.find((p) => p.id === selected)?.x ?? 0} · y{" "}
              {layout.pieces.find((p) => p.id === selected)?.y ?? 0}
            </span>
          )}
          {message && <span>{message}</span>}
          {savedAt && <span>Guardado {savedAt}</span>}
          <span className="spacer" />
          <span>Servidor + localStorage</span>
        </footer>
      </div>
    </div>
  );
}
