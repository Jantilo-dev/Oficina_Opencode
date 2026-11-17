import { CUBICLES, CUBICLES2 } from "./sprites";
import type { Point } from "./occupancy";

const WIDTH = 1600;
const HEIGHT = 2020;
const CELL = 6;
const COLS = Math.ceil(WIDTH / CELL);
const ROWS = Math.ceil(HEIGHT / CELL);

type Block = { x: number; y: number; w: number; h: number };
const blocks: Block[] = [];

function block(x: number, y: number, w: number, h: number) {
  blocks.push({ x, y, w, h });
}

function vSegments(x: number, y1: number, y2: number, gaps: Array<[number, number]>) {
  let cursor = y1;
  for (const [from, to] of gaps) {
    if (from > cursor) block(x, cursor, 10, from - cursor);
    cursor = to;
  }
  if (cursor < y2) block(x, cursor, 10, y2 - cursor);
}

function hSegments(y: number, x1: number, x2: number, gaps: Array<[number, number]>) {
  let cursor = x1;
  for (const [from, to] of gaps) {
    if (from > cursor) block(cursor, y, from - cursor, 10);
    cursor = to;
  }
  if (cursor < x2) block(cursor, y, x2 - cursor, 10);
}

block(0, 0, WIDTH, 150);
block(18, 150, 12, 1850);
block(1570, 150, 12, 1850);
block(18, 2000, 1552, 14);
hSegments(1330, 18, 1582, [
  [550, 590],
  [1110, 1150],
  [1230, 1270]
]);
block(30, 1342, 520, 18);
block(590, 1342, 520, 18);
block(1150, 1342, 80, 18);
block(1270, 1342, 300, 18);

hSegments(1420, 30, 550, []);
hSegments(1420, 590, 1110, []);
hSegments(1420, 1150, 1570, []);
hSegments(1650, 30, 550, [[250, 330]]);
hSegments(1650, 590, 1110, [[810, 890]]);
hSegments(1650, 1150, 1570, [[1320, 1400]]);
hSegments(1720, 30, 550, []);
hSegments(1720, 590, 1110, []);
hSegments(1720, 1150, 1570, []);
hSegments(1950, 30, 550, [[250, 330]]);
hSegments(1950, 590, 1110, [[810, 890]]);
hSegments(1950, 1150, 1570, [[1320, 1400]]);

vSegments(30, 1420, 1650, []);
vSegments(550, 1420, 1650, []);
vSegments(590, 1420, 1650, []);
vSegments(1110, 1420, 1650, []);
vSegments(1150, 1420, 1650, []);
vSegments(30, 1720, 1950, []);
vSegments(550, 1720, 1950, []);
vSegments(590, 1720, 1950, []);
vSegments(1110, 1720, 1950, []);
vSegments(1150, 1720, 1950, []);

const roomGaps: Array<[number, number]> = [
  [480, 520],
  [890, 930],
  [1200, 1240]
];
vSegments(550, 150, 1330, roomGaps);
vSegments(590, 150, 1330, []);
vSegments(1110, 150, 1330, roomGaps);
vSegments(1150, 150, 1330, [[900, 940]]);

hSegments(580, 30, 550, []);
hSegments(580, 590, 1110, []);
hSegments(1000, 30, 550, []);
hSegments(1000, 590, 1110, []);
hSegments(615, 1150, 1570, [
  [1240, 1272],
  [1400, 1432]
]);

for (const cubicle of CUBICLES) block(cubicle.x, cubicle.y, cubicle.w, cubicle.h);
for (const cubicle of CUBICLES2) block(cubicle.x, cubicle.y, cubicle.w, cubicle.h);

block(52, 1070, 316, 22);
block(72, 1038, 46, 34);
block(150, 1080, 34, 64);
block(306, 1056, 54, 88);
block(110, 1186, 180, 40);
block(1420, 825, 120, 50);

block(626, 1150, 250, 84);
block(1178, 350, 120, 12);
block(1370, 350, 120, 12);
block(1340, 168, 10, 457);
for (let row = 0; row < 2; row++) {
  for (let index = 0; index < 3; index++) {
    block(1160 + index * 60, row === 0 ? 200 : 440, 56, 84);
    block(1352 + index * 60, row === 0 ? 200 : 440, 56, 84);
  }
}
block(1160, 700, 130, 44);
block(1300, 760, 70, 26);
block(1340, 840, 80, 34);

const CLEARANCE = 2;

export function isBlockedPoint(x: number, y: number, clearance = CLEARANCE): boolean {
  if (x < 22 || x > 1568 || y < 152 || y > 1998) return true;
  for (const item of blocks) {
    if (
      x >= item.x - clearance &&
      x < item.x + item.w + clearance &&
      y >= item.y - clearance &&
      y < item.y + item.h + clearance
    ) {
      return true;
    }
  }
  return false;
}

function cellIndex(cx: number, cy: number): number {
  return cy * COLS + cx;
}

const blockedCells = new Uint8Array(COLS * ROWS);
for (let cy = 0; cy < ROWS; cy++) {
  for (let cx = 0; cx < COLS; cx++) {
    blockedCells[cellIndex(cx, cy)] = isBlockedPoint(cx * CELL + CELL / 2, cy * CELL + CELL / 2) ? 1 : 0;
  }
}

function cellBlocked(cx: number, cy: number): boolean {
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return true;
  return blockedCells[cellIndex(cx, cy)] === 1;
}

function nearestFree(x: number, y: number): { cx: number; cy: number } {
  let cx = Math.max(0, Math.min(COLS - 1, Math.floor(x / CELL)));
  let cy = Math.max(0, Math.min(ROWS - 1, Math.floor(y / CELL)));
  if (!cellBlocked(cx, cy)) return { cx, cy };
  for (let radius = 1; radius <= 40; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (!cellBlocked(nx, ny)) return { cx: nx, cy: ny };
      }
    }
  }
  return { cx, cy };
}

class Heap {
  private items: Array<{ index: number; score: number }> = [];

  get size(): number {
    return this.items.length;
  }

  push(index: number, score: number) {
    const items = this.items;
    items.push({ index, score });
    let child = items.length - 1;
    while (child > 0) {
      const parent = (child - 1) >> 1;
      if (items[parent].score <= items[child].score) break;
      [items[parent], items[child]] = [items[child], items[parent]];
      child = parent;
    }
  }

  pop(): number {
    const items = this.items;
    const first = items[0];
    const last = items.pop();
    if (!last || items.length === 0) return first?.index ?? -1;
    items[0] = last;
    let parent = 0;
    while (true) {
      const left = parent * 2 + 1;
      const right = left + 1;
      let smallest = parent;
      if (left < items.length && items[left].score < items[smallest].score) smallest = left;
      if (right < items.length && items[right].score < items[smallest].score) smallest = right;
      if (smallest === parent) break;
      [items[parent], items[smallest]] = [items[smallest], items[parent]];
      parent = smallest;
    }
    return first.index;
  }
}

function heuristic(a: number, b: number): number {
  const ax = a % COLS;
  const ay = Math.floor(a / COLS);
  const bx = b % COLS;
  const by = Math.floor(b / COLS);
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return (Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy)) * CELL;
}

function lineClear(a: Point, b: Point): boolean {
  const distance = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(1, Math.ceil(distance));
  for (let step = 1; step < steps; step++) {
    const t = step / steps;
    if (isBlockedPoint(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
  }
  return true;
}

function simplify(points: Point[]): Point[] {
  if (points.length <= 2) return points;
  const result: Point[] = [points[0]];
  let index = 0;
  while (index < points.length - 1) {
    let next = points.length - 1;
    for (; next > index + 1; next--) {
      if (lineClear(points[index], points[next])) break;
    }
    result.push(points[next]);
    index = next;
  }
  return result;
}

export function findPath(from: Point, to: Point): Point[] {
  const start = nearestFree(from.x, from.y);
  const goal = nearestFree(to.x, to.y);
  const startIndex = cellIndex(start.cx, start.cy);
  const goalIndex = cellIndex(goal.cx, goal.cy);
  if (startIndex === goalIndex) return lineClear(from, to) ? [from, to] : [];

  const total = COLS * ROWS;
  const gScore = new Float64Array(total).fill(Number.POSITIVE_INFINITY);
  const parents = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);
  const heap = new Heap();
  gScore[startIndex] = 0;
  heap.push(startIndex, heuristic(startIndex, goalIndex));

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1]
  ];

  let found = false;
  while (heap.size > 0) {
    const current = heap.pop();
    if (current < 0) break;
    if (closed[current]) continue;
    closed[current] = 1;
    if (current === goalIndex) {
      found = true;
      break;
    }
    const cx = current % COLS;
    const cy = Math.floor(current / COLS);
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (cellBlocked(nx, ny)) continue;
      if (dx !== 0 && dy !== 0 && (cellBlocked(cx + dx, cy) || cellBlocked(cx, cy + dy))) continue;
      const next = cellIndex(nx, ny);
      if (closed[next]) continue;
      const stepCost = (dx !== 0 && dy !== 0 ? Math.SQRT2 : 1) * CELL;
      const score = gScore[current] + stepCost;
      if (score >= gScore[next]) continue;
      gScore[next] = score;
      parents[next] = current;
      heap.push(next, score + heuristic(next, goalIndex));
    }
  }

  if (!found) return [];

  const cells: Point[] = [];
  let cursor = goalIndex;
  while (cursor >= 0) {
    const cx = cursor % COLS;
    const cy = Math.floor(cursor / COLS);
    cells.push({ x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2 });
    if (cursor === startIndex) break;
    cursor = parents[cursor];
  }
  cells.reverse();
  const points = [from, ...cells, to];
  return simplify(points);
}
