import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import layoutData from "./layout-v3.json";
import {
  ROOM_H,
  ROOM_W,
  TILE_H,
  TILE_W,
  WALL_HEIGHT,
  WORLD_LAYOUT_STORAGE_KEY,
  drawFloor,
  drawLighting,
  drawSprite,
  drawWalls,
  drawWindows,
  loadSpriteCatalog,
  point,
  spriteKey,
  type Sprite
} from "./WorldRoom";
import type { OfficeItem, OfficeItemType, OfficeLayout } from "./schema";

type Props = {
  onClose: () => void;
};

type PaletteItem = {
  id: string;
  label: string;
  type: OfficeItemType;
  variant?: string;
  sprite: string;
};

type Size = { width: number; height: number };
type Pan = { x: number; y: number };
const BLOCK_STEP = 1;
type Drag = {
  itemId?: string;
  x: number;
  y: number;
  panX: number;
  panY: number;
  itemStartX?: number;
  itemStartY?: number;
};

const PALETTE: Array<{ title: string; items: PaletteItem[] }> = [
  {
      title: "Escritorios",
    items: [
      { id: "desk", label: "Escritorio dual", type: "desk", sprite: "desk" },
      { id: "desk-laptop", label: "Escritorio laptop", type: "desk", variant: "laptop", sprite: "deskLaptop" },
      { id: "desk-reception", label: "Recepción", type: "desk", variant: "reception", sprite: "receptionDesk" },
      { id: "meeting-table", label: "Mesa reunión", type: "table", sprite: "meetingTable" }
    ]
  },
  {
    title: "Asientos",
    items: [
      { id: "chair", label: "Silla ergonómica", type: "chair", sprite: "chair" },
      { id: "sofa", label: "Sofá", type: "sofa", sprite: "sofa" }
    ]
  },
  {
    title: "Oficina",
    items: [
      { id: "printer", label: "Impresora multifunción", type: "printer", sprite: "printer" },
      { id: "plant", label: "Planta", type: "plant", sprite: "plant" },
      { id: "water", label: "Agua", type: "water", sprite: "water" },
      { id: "coffee", label: "Cafetera", type: "coffee", sprite: "coffee" },
      { id: "whiteboard", label: "Pizarra", type: "whiteboard", sprite: "whiteboard" }
      ]
  },
  {
    title: "Paredes",
    items: [
      { id: "wall-1", label: "Pared acristalada", type: "wall1", sprite: "wall1" },
      { id: "wall-2", label: "Pared panel", type: "wall2", sprite: "wall2" }
    ]
  }
];

const DEFAULT_LAYOUT = layoutData as OfficeLayout;

const DEFAULT_FOOTPRINTS: Partial<Record<OfficeItemType, { width: number; depth: number }>> = {
  desk: { width: 2.6, depth: 1.25 },
  table: { width: 4.6, depth: 2.2 },
  chair: { width: 0.9, depth: 0.9 },
  meetingChair: { width: 0.9, depth: 0.9 },
  sofa: { width: 2.4, depth: 1.1 },
  cabinet: { width: 1.5, depth: 1.1 },
  printer: { width: 1.1, depth: 0.9 },
  plant: { width: 0.7, depth: 0.7 },
  partition: { width: 4, depth: 0.25 },
  water: { width: 0.55, depth: 0.55 },
  coffee: { width: 0.6, depth: 0.5 },
  whiteboard: { width: 3.2, depth: 0.12 },
  wall1: { width: 4, depth: 0.2 },
  wall2: { width: 4, depth: 0.2 }
};

function baseFootprint(item: Pick<OfficeItem, "type" | "variant" | "w" | "d">) {
  const fallback = DEFAULT_FOOTPRINTS[item.type] ?? { width: 1, depth: 1 };
  return { width: item.w ?? fallback.width, depth: item.d ?? fallback.depth };
}

function footprint(item: OfficeItem) {
  const base = baseFootprint(item);
  return base;
}

function footprintCorners(item: OfficeItem) {
  const size = footprint(item);
  const left = item.x - size.width / 2;
  const back = item.y - size.depth / 2;
  const front = item.y + size.depth / 2;
  return [
    point(left, back),
    point(left + size.width, back),
    point(left + size.width, front),
    point(left, front)
  ];
}

function clampPosition(item: OfficeItem, x: number, y: number) {
  const size = footprint(item);
  const minX = size.width / 2;
  const maxX = ROOM_W - size.width / 2;
  const minY = size.depth / 2;
  const maxY = ROOM_H - size.depth / 2;
  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y))
  };
}

function snapPosition(item: OfficeItem, x: number, y: number, items: OfficeItem[]) {
  const current = {
    x: Math.round(x / BLOCK_STEP) * BLOCK_STEP,
    y: Math.round(y / BLOCK_STEP) * BLOCK_STEP
  };
  if (item.type !== "desk") return clampPosition(item, current.x, current.y);
  const size = footprint(item);
  const snapDistance = 0.8;
  for (const other of items) {
    if (other.id === item.id || other.type !== "desk") continue;
    const otherSize = footprint(other);
    const sideOffset = (size.width + otherSize.width) / 2;
    const frontOffset = (size.depth + otherSize.depth) / 2;
    const sameRow = Math.abs(current.y - other.y) <= snapDistance;
    const sameColumn = Math.abs(current.x - other.x) <= snapDistance;
    if (sameRow && Math.abs(current.x - (other.x - sideOffset)) <= snapDistance) current.x = other.x - sideOffset;
    if (sameRow && Math.abs(current.x - (other.x + sideOffset)) <= snapDistance) current.x = other.x + sideOffset;
    if (sameColumn && Math.abs(current.y - (other.y - frontOffset)) <= snapDistance) current.y = other.y - frontOffset;
    if (sameColumn && Math.abs(current.y - (other.y + frontOffset)) <= snapDistance) current.y = other.y + frontOffset;
  }
  return clampPosition(item, Math.round(current.x / BLOCK_STEP) * BLOCK_STEP, Math.round(current.y / BLOCK_STEP) * BLOCK_STEP);
}

function copyLayout(value: OfficeLayout): OfficeLayout {
  return JSON.parse(JSON.stringify(value)) as OfficeLayout;
}

function loadLayout(): OfficeLayout {
  try {
    const raw = window.localStorage.getItem(WORLD_LAYOUT_STORAGE_KEY);
    if (!raw) return copyLayout(DEFAULT_LAYOUT);
    const value = JSON.parse(raw) as Partial<OfficeLayout>;
    if (value.version !== 3 || !value.room || !Array.isArray(value.items)) return copyLayout(DEFAULT_LAYOUT);
    return {
      ...value,
      items: (value.items as OfficeItem[]).map((item) => ({
        ...item,
        ...(item.type === "desk" ? snapPosition(item, item.x, item.y, value.items as OfficeItem[]) : clampPosition(item, item.x, item.y))
      }))
    } as OfficeLayout;
  } catch {
    return copyLayout(DEFAULT_LAYOUT);
  }
}

function geometry(size: Size) {
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
}

function worldFromScreen(clientX: number, clientY: number, element: HTMLDivElement, size: Size, pan: Pan, zoom: number, snap = true) {
  const bounds = element.getBoundingClientRect();
  const room = geometry(size);
  const scale = room.base * zoom;
  const worldX = (clientX - bounds.left - size.width / 2 - pan.x) / scale + room.centerX;
  const worldY = (clientY - bounds.top - size.height / 2 - pan.y) / scale + room.centerY;
  const x = ((worldX / (TILE_W / 2)) + (worldY / (TILE_H / 2))) / 2;
  const y = ((worldY / (TILE_H / 2)) - (worldX / (TILE_W / 2))) / 2;
  return snap
    ? { x: Math.round(x / BLOCK_STEP) * BLOCK_STEP, y: Math.round(y / BLOCK_STEP) * BLOCK_STEP }
    : { x, y };
}

function SpriteThumbnail({ sprite }: { sprite?: Sprite }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sprite) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    const scale = Math.min(72 / sprite.width, 58 / sprite.height);
    ctx.drawImage(sprite.canvas, (canvas.width - sprite.width * scale) / 2, canvas.height - sprite.height * scale - 2, sprite.width * scale, sprite.height * scale);
  }, [sprite]);
  return <canvas ref={canvasRef} width={84} height={64} className="world-editor-thumb" />;
}

export default function WorldEditor({ onClose }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [layout, setLayout] = useState<OfficeLayout>(loadLayout);
  const [sprites, setSprites] = useState<Map<string, Sprite>>(new Map());
  const [size, setSize] = useState<Size>({ width: 1000, height: 720 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placing, setPlacing] = useState<PaletteItem | null>(null);
  const [message, setMessage] = useState("Selecciona un producto y colócalo en la cuadrícula de bloques.");

  const paletteBySprite = useMemo(() => new Map(PALETTE.flatMap((section) => section.items).map((item) => [item.sprite, item])), []);

  useEffect(() => {
    let active = true;
    loadSpriteCatalog().then((catalog) => {
      if (active) setSprites(catalog);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const update = () => {
      const bounds = element.getBoundingClientRect();
      setSize({ width: Math.max(420, Math.floor(bounds.width)), height: Math.max(320, Math.floor(bounds.height)) });
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
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#d9e0e6";
      ctx.fillRect(0, 0, size.width, size.height);
      const room = geometry(size);
      const scale = room.base * zoom;
      ctx.save();
      ctx.translate(size.width / 2 + pan.x, size.height / 2 + pan.y);
      ctx.scale(scale, scale);
      ctx.translate(-room.centerX, -room.centerY);
      drawFloor(ctx);
      drawWalls(ctx);
      drawWindows(ctx);
      drawLighting(ctx);
      const selected = layout.items.find((item) => item.id === selectedId);
      if (selected) {
        const corners = footprintCorners(selected);
        ctx.fillStyle = "#ffe27a33";
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (const corner of corners.slice(1)) ctx.lineTo(corner.x, corner.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#ffe27a";
        ctx.lineWidth = 1.5 / scale;
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (const corner of corners.slice(1)) ctx.lineTo(corner.x, corner.y);
        ctx.closePath();
        ctx.stroke();
      }
      const items = [...layout.items].sort((a, b) => a.y - b.y);
      for (const item of items) drawSprite(ctx, item, sprites, time);
      ctx.restore();
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [layout, pan, selectedId, size, sprites, zoom]);

  function updateItems(update: (items: OfficeItem[]) => OfficeItem[]) {
    setLayout((value) => ({ ...value, items: update(value.items) }));
  }

  function hitTest(event: ReactPointerEvent<HTMLCanvasElement>) {
    const stage = stageRef.current;
    if (!stage) return null;
    const room = geometry(size);
    const scale = room.base * zoom;
    const world = worldFromScreen(event.clientX, event.clientY, stage, size, pan, zoom, false);
    const worldPoint = point(world.x, world.y);
    const renderedItems = [...layout.items].sort((a, b) => a.y - b.y);
    for (const item of renderedItems.reverse()) {
      const key = spriteKey(item);
      const sprite = key ? sprites.get(key) : undefined;
      if (!sprite) continue;
      const p = point(item.x, item.y);
      const width = sprite.width * sprite.scale;
      const height = sprite.height * sprite.scale;
      if (Math.abs(worldPoint.x - p.x) > width / 2 || worldPoint.y < p.y - height || worldPoint.y > p.y) continue;
      let sourceX = Math.floor(((worldPoint.x - (p.x - width / 2)) / width) * sprite.width);
      const sourceY = Math.floor(((worldPoint.y - (p.y - height)) / height) * sprite.height);
      if ((item.rotation ?? 0) % 2 === 1) sourceX = sprite.width - 1 - sourceX;
      if (sourceX < 0 || sourceX >= sprite.width || sourceY < 0 || sourceY >= sprite.height) continue;
      const alpha = sprite.canvas.getContext("2d")?.getImageData(sourceX, sourceY, 1, 1).data[3] ?? 0;
      if (alpha > 20) return item.id;
    }
    return null;
  }

  function place(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!placing || !stageRef.current) return;
    const position = worldFromScreen(event.clientX, event.clientY, stageRef.current, size, pan, zoom);
    const item: OfficeItem = {
      id: `item-${Date.now().toString(36)}`,
      type: placing.type,
      variant: placing.variant,
      x: position.x,
      y: position.y,
      w: baseFootprint(placing).width,
      d: baseFootprint(placing).depth,
      rotation: 0
    };
      Object.assign(item, snapPosition(item, position.x, position.y, layout.items));
    updateItems((items) => [...items, item]);
    setSelectedId(item.id);
    setPlacing(null);
    setMessage(`${placing.label} colocado.`);
  }

  function rotateSelected() {
    if (!selectedId) return;
    updateItems((items) => {
      const selected = items.find((item) => item.id === selectedId);
      if (!selected) return items;
      const nextRotation = (((selected.rotation ?? 0) + 1) % 4) as 0 | 1 | 2 | 3;
      return items.map((item) => {
        if (item.id === selectedId) return { ...item, rotation: nextRotation };
        if (selected.type !== "desk" || item.type !== "chair") return item;
        const dx = item.x - selected.x;
        const dy = item.y - selected.y;
        if (Math.hypot(dx, dy) > 3.5) return item;
        return {
          ...item,
          x: Math.round(selected.x - dy),
          y: Math.round(selected.y + dx),
          rotation: (((item.rotation ?? 0) + 1) % 4) as 0 | 1 | 2 | 3
        };
      });
    });
    setMessage("Objeto girado hacia la derecha.");
  }

  function removeSelected() {
    if (!selectedId) return;
    updateItems((items) => items.filter((item) => item.id !== selectedId));
    setSelectedId(null);
    setMessage("Objeto eliminado.");
  }

  function save() {
    window.localStorage.setItem(WORLD_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    window.dispatchEvent(new Event("pixel-office-world-layout"));
    setMessage("Layout guardado localmente.");
  }

  function closeEditor() {
    window.localStorage.setItem(WORLD_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    window.dispatchEvent(new Event("pixel-office-world-layout"));
    onClose();
  }

  function exportLayout() {
    const blob = new Blob([JSON.stringify(layout, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pixel-office-layout-v3.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Layout exportado.");
  }

  function onDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    if (event.button === 2) {
      dragRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
      return;
    }
    if (placing) {
      place(event);
      return;
    }
    const itemId = hitTest(event);
    setSelectedId(itemId);
    const item = itemId ? layout.items.find((candidate) => candidate.id === itemId) : undefined;
    dragRef.current = {
      itemId: itemId ?? undefined,
      x: event.clientX,
      y: event.clientY,
      panX: pan.x,
      panY: pan.y,
      itemStartX: item?.x,
      itemStartY: item?.y
    };
  }

  function onMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    if (!drag.itemId) {
      setPan({ x: drag.panX + event.clientX - drag.x, y: drag.panY + event.clientY - drag.y });
      return;
    }
    const scale = geometry(size).base * zoom;
    const dx = (event.clientX - drag.x) / scale;
    const dy = (event.clientY - drag.y) / scale;
    const gridX = (dx / (TILE_W / 2) + dy / (TILE_H / 2)) / 2;
    const gridY = (dy / (TILE_H / 2) - dx / (TILE_W / 2)) / 2;
    const startX = drag.itemStartX ?? 0;
    const startY = drag.itemStartY ?? 0;
    updateItems((items) => items.map((item) => {
      if (item.id !== drag.itemId) return item;
       const position = snapPosition(item, startX + gridX, startY + gridY, items);
      return { ...item, ...position };
    }));
  }

  function onWheel(event: ReactWheelEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const next = Math.max(0.55, Math.min(2.6, zoom - event.deltaY * 0.001));
    setZoom(next);
  }

  function importLayout(file: File) {
    void file.text().then((text) => {
      try {
        const value = JSON.parse(text) as Partial<OfficeLayout>;
        if (value.version !== 3 || !value.room || !Array.isArray(value.items)) throw new Error("invalid");
        setLayout(value as OfficeLayout);
        setSelectedId(null);
        setMessage("Layout importado.");
      } catch {
        setMessage("El JSON no es un layout v3 válido.");
      }
    });
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "r") rotateSelected();
      if (event.key === "Delete" || event.key === "Backspace") removeSelected();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function endDrag(event?: ReactPointerEvent<HTMLCanvasElement>) {
    if (event && event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
  }

  return (
    <div className="layout-backdrop">
      <div className="layout-shell world-editor-shell">
        <header className="layout-head">
          <div>
            <h2>EDITOR ISO · OFICINA V3</h2>
            <span className="world-editor-subtitle">Construye con los productos de Diseño</span>
          </div>
          <div className="layout-actions">
            <button type="button" className="btn ghost" onClick={save}>Guardar</button>
            <button type="button" className="btn ghost" onClick={exportLayout}>Exportar</button>
            <label className="btn ghost">
              Importar
              <input type="file" accept="application/json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) importLayout(file); }} />
            </label>
            <button type="button" className="btn ghost danger" onClick={removeSelected} disabled={!selectedId}>Borrar</button>
            <button type="button" className="btn ghost" onClick={rotateSelected} disabled={!selectedId}>Girar derecha</button>
            <button type="button" className="btn primary" onClick={closeEditor}>Cerrar</button>
          </div>
        </header>
        <div className="layout-body world-editor-body">
          <aside className="layout-palette world-editor-palette">
            <h3>Muebles</h3>
            <p className="world-editor-help">Clic en un mueble y luego en un bloque. Los escritorios se alinean automáticamente a la cuadrícula.</p>
            {PALETTE.map((section) => (
              <section key={section.title} className="world-editor-section">
                <h3>{section.title}</h3>
                {section.items.map((item) => (
                  <button key={item.id} type="button" className={`world-editor-product ${placing?.id === item.id ? "on" : ""}`} onClick={() => { setPlacing(item); setMessage(`Colocando ${item.label}.`); }}>
                    <SpriteThumbnail sprite={sprites.get(item.sprite)} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </section>
            ))}
          </aside>
          <div className="layout-stage world-editor-stage" ref={stageRef}>
            <div className="layout-hint">{placing ? `Colocando: ${placing.label}` : "Clic selecciona · arrastra mueve · R gira derecha · Supr elimina · rueda zoom · botón derecho desplaza"}</div>
            <canvas ref={canvasRef} className="layout-canvas" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={endDrag} onPointerCancel={endDrag} onWheel={onWheel} onContextMenu={(event) => event.preventDefault()} />
          </div>
        </div>
        <footer className="layout-foot">
          <span>{layout.items.length} objetos</span>
          <span>{ROOM_W} × {ROOM_H} baldosas</span>
          <span>{Math.round(zoom * 100)}%</span>
          {selectedId && (() => {
            const selected = layout.items.find((item) => item.id === selectedId);
            return <span>seleccionado: {selected ? paletteBySprite.get(spriteKey(selected) ?? "")?.label ?? "objeto" : "objeto"}</span>;
          })()}
          <span>{message}</span>
        </footer>
      </div>
    </div>
  );
}
