import { CUBICLES, CUBICLES2 } from "./sprites";
import type { Point } from "./occupancy";

const WIDTH = 1280;
const HEIGHT = 1640;
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
block(18, 150, 12, 1470);
block(1250, 150, 12, 1470);
block(18, 1620, 1244, 14);
hSegments(950, 18, 1262, [[610, 668]]);
block(30, 962, 580, 18);
block(668, 962, 572, 18);

hSegments(1040, 30, 410, []);
hSegments(1040, 450, 830, []);
hSegments(1040, 870, 1250, []);
hSegments(1270, 30, 410, [[200, 240]]);
hSegments(1270, 450, 830, [[620, 660]]);
hSegments(1270, 870, 1250, [[1040, 1080]]);
hSegments(1340, 30, 410, []);
hSegments(1340, 450, 830, []);
hSegments(1340, 870, 1250, []);
hSegments(1570, 30, 410, [[200, 240]]);
hSegments(1570, 450, 830, [[620, 660]]);
hSegments(1570, 870, 1250, [[1040, 1080]]);

vSegments(30, 1040, 1270, []);
vSegments(410, 1040, 1270, []);
vSegments(450, 1040, 1270, []);
vSegments(830, 1040, 1270, []);
vSegments(870, 1040, 1270, []);
vSegments(30, 1340, 1570, []);
vSegments(410, 1340, 1570, []);
vSegments(450, 1340, 1570, []);
vSegments(830, 1340, 1570, []);
vSegments(870, 1340, 1570, []);

const roomGaps: Array<[number, number]> = [
  [316, 356],
  [384, 432],
  [548, 588],
  [620, 660],
  [796, 836]
];
vSegments(382, 150, 950, roomGaps);
vSegments(440, 150, 950, roomGaps);
vSegments(790, 150, 950, roomGaps);
vSegments(840, 150, 950, [
  [316, 356],
  [384, 432],
  [548, 588],
  [620, 660],
  [746, 786],
  [796, 836]
]);

hSegments(410, 30, 382, [[156, 196]]);
hSegments(410, 448, 790, [[556, 596]]);
hSegments(655, 30, 382, [[156, 196]]);
hSegments(655, 448, 790, [[556, 596]]);
hSegments(615, 848, 1250, [
  [960, 992],
  [1120, 1152]
]);

for (const cubicle of CUBICLES) block(cubicle.x, cubicle.y, cubicle.w, cubicle.h);
for (const cubicle of CUBICLES2) block(cubicle.x, cubicle.y, cubicle.w, cubicle.h);

block(52, 690, 316, 22);
block(72, 658, 46, 34);
block(150, 700, 34, 64);
block(306, 676, 54, 88);
block(110, 806, 180, 40);
block(1100, 825, 120, 50);

block(486, 770, 250, 84);
block(876, 350, 120, 12);
block(1068, 350, 120, 12);
block(1040, 168, 10, 457);
for (let row = 0; row < 2; row++) {
  for (let index = 0; index < 3; index++) {
    block(858 + index * 60, row === 0 ? 200 : 440, 56, 84);
    block(1050 + index * 60, row === 0 ? 200 : 440, 56, 84);
  }
}
block(880, 700, 130, 44);
block(1020, 760, 70, 26);
block(1060, 840, 80, 34);

const CLEARANCE = 2;

export function isBlockedPoint(x: number, y: number, clearance = CLEARANCE): boolean {
  if (x < 22 || x > 1248 || y < 152 || y > 1618) return true;
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

function cellBlocked(cx: number, cy: number): boolean {
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return true;
  return isBlockedPoint(cx * CELL + CELL / 2, cy * CELL + CELL / 2);
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
  if (startIndex === goalIndex) return [from, to];

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

  if (!found) return [from, to];

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


