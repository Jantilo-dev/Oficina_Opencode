import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import {
  CAFE_SPOTS,
  CUBICLES,
  HALL_SPOTS,
  agentColors,
  drawScene,
  type AgentView,
  type SceneAgent
} from "./sprites";

type Props = {
  agents: SceneAgent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

type Motion = { x: number; y: number; via: { x: number; y: number } | null; kind: "seat" | "cafe" | "hall" };

function hashOf(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash;
}

export default function OfficeCanvas({ agents, selectedId, onSelect }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const agentsRef = useRef<SceneAgent[]>(agents);
  const viewsRef = useRef<AgentView[]>([]);
  const selectedRef = useRef<string | null>(selectedId);
  const assignmentRef = useRef(new Map<string, number>());
  const motionRef = useRef(new Map<string, Motion>());
  const viewRef = useRef({ sx: 1, sy: 1, offsetX: 0, offsetY: 0 });
  const [size, setSize] = useState({ width: 1280, height: 900 });

  selectedRef.current = selectedId;
  agentsRef.current = agents;

  const layout = useMemo(() => ({ width: 1280, height: 980 }), []);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const update = () => {
      const bounds = element.getBoundingClientRect();
      setSize({ width: Math.max(320, Math.floor(bounds.width)), height: Math.max(240, Math.floor(bounds.height)) });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const used = new Set(assignmentRef.current.values());
    for (const agent of agents) {
      if (assignmentRef.current.has(agent.id)) continue;
      let slot = -1;
      for (let i = 0; i < CUBICLES.length; i++) {
        if (!used.has(i)) {
          slot = i;
          break;
        }
      }
      if (slot >= 0) {
        assignmentRef.current.set(agent.id, slot);
        used.add(slot);
        const cubicle = CUBICLES[slot];
        const working = agent.status !== "idle" && agent.status !== "talking";
        if (working) {
          const existing = motionRef.current.get(agent.id);
          if (!existing) {
            motionRef.current.set(agent.id, { x: cubicle.seatX, y: cubicle.seatY, via: null, kind: "seat" });
          } else if (existing.kind !== "seat") {
            existing.x = cubicle.seatX;
            existing.y = cubicle.seatY;
            existing.via = null;
            existing.kind = "seat";
          }
        }
      }
    }
    const ids = new Set(agents.map((agent) => agent.id));
    for (const id of [...assignmentRef.current.keys()]) {
      if (!ids.has(id)) assignmentRef.current.delete(id);
    }
    for (const id of [...motionRef.current.keys()]) {
      if (!ids.has(id)) motionRef.current.delete(id);
    }
  }, [agents]);

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

    const scaleX = size.width / layout.width;
    const scaleY = size.height / layout.height;
    const difference = Math.abs(scaleX - scaleY) / Math.max(scaleX, scaleY);
    let sx = scaleX;
    let sy = scaleY;
    let offsetX = 0;
    let offsetY = 0;
    if (difference > 0.35) {
      const scale = Math.min(scaleX, scaleY);
      sx = scale;
      sy = scale;
      offsetX = (size.width - layout.width * scale) / 2;
      offsetY = (size.height - layout.height * scale) / 2;
    }
    viewRef.current = { sx, sy, offsetX, offsetY };

    let frame = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const talkingIds = agentsRef.current.filter((item) => item.status === "talking").map((item) => item.id);
      const idleIds = agentsRef.current.filter((item) => item.status === "idle").map((item) => item.id);
      const views: AgentView[] = [];
      for (const agent of agentsRef.current) {
        const index = assignmentRef.current.get(agent.id) ?? -1;
        const cubicle = index >= 0 ? CUBICLES[index] : null;
        const hash = hashOf(agent.id);
        let kind: Motion["kind"] = "seat";
        let targetX = cubicle ? cubicle.seatX : HALL_SPOTS[hash % HALL_SPOTS.length].x;
        let targetY = cubicle ? cubicle.seatY : HALL_SPOTS[hash % HALL_SPOTS.length].y;

        if (agent.status === "idle") {
          kind = "cafe";
          const idleIndex = Math.max(0, idleIds.indexOf(agent.id));
          const spot = CAFE_SPOTS[idleIndex % CAFE_SPOTS.length];
          targetX = spot.x;
          targetY = spot.y;
        } else if (agent.status === "talking") {
          kind = "hall";
          const talkerIndex = Math.max(0, talkingIds.indexOf(agent.id));
          const spot = HALL_SPOTS[talkerIndex % HALL_SPOTS.length];
          targetX = spot.x;
          targetY = spot.y;
        } else if (!cubicle) {
          kind = "hall";
        }

        let motion = motionRef.current.get(agent.id);
        if (!motion) {
          motion = { x: targetX, y: targetY, via: null, kind };
          motionRef.current.set(agent.id, motion);
        }

        if (motion.kind !== kind) {
          motion.kind = kind;
          if (cubicle) {
            motion.via = { x: cubicle.x + cubicle.w / 2, y: cubicle.y + cubicle.h + 26 };
          } else {
            motion.via = null;
          }
        }

        const speed = 120;
        if (motion.via) {
          const dx = motion.via.x - motion.x;
          const dy = motion.via.y - motion.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 4) {
            motion.via = null;
          } else {
            const step = Math.min(distance, speed * dt);
            motion.x += (dx / distance) * step;
            motion.y += (dy / distance) * step;
          }
        } else {
          const dx = targetX - motion.x;
          const dy = targetY - motion.y;
          const distance = Math.hypot(dx, dy);
          if (distance > 2) {
            const step = Math.min(distance, speed * dt);
            motion.x += (dx / distance) * step;
            motion.y += (dy / distance) * step;
          }
        }

        const distanceToTarget = Math.hypot(targetX - motion.x, targetY - motion.y);
        const seated = kind === "seat" && distanceToTarget < 8 && !motion.via;
        views.push({
          id: agent.id,
          name: agent.name,
          status: agent.status,
          task: agent.task,
          file: agent.file,
          logs: agent.logs,
          x: motion.x,
          y: motion.y,
          walking: distanceToTarget > 8,
          seated,
          colors: agentColors(agent.id)
        });
      }

      const screens = new Array(CUBICLES.length).fill(false);
      for (const view of views) {
        if (!view.seated || view.status === "idle" || view.status === "talking") continue;
        const index = assignmentRef.current.get(view.id);
        if (index !== undefined) screens[index] = true;
      }
      viewsRef.current = views;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#1b2430";
      ctx.fillRect(0, 0, size.width, size.height);
      ctx.translate(offsetX, offsetY);
      ctx.scale(sx, sy);
      drawScene(ctx, layout.width, layout.height, views, now, selectedRef.current, screens);
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [size, layout]);

  const onClick = (event: MouseEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const view = viewRef.current;
    const x = (event.clientX - bounds.left - view.offsetX) / view.sx;
    const y = (event.clientY - bounds.top - view.offsetY) / view.sy;
    for (const agent of [...viewsRef.current].reverse()) {
      if (Math.abs(agent.x - x) < 34 && y > agent.y - 80 && y < agent.y + 20) {
        onSelect(agent.id);
        return;
      }
    }
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} onClick={onClick} />
    </div>
  );
}
