import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import {
  BREAK_SPOTS,
  MEETING_SPOTS,
  SEATS,
  SEAT_OPTIONS,
  STANDING_SPOTS,
  advance,
  breakDuration,
  breakMode,
  firstBreakDelay,
  hashOf,
  maxBreakers,
  nextBreakDelay,
  overflowSpot,
  seatExit,
  setDestination,
  type Motion,
  type Placement,
  type Point
} from "./occupancy";
import { findPath } from "./navigation";
import type { ThemeName } from "../office/sprites";
import {
  ENTRANCE,
  MANAGER_SEAT,
  WORKSTATIONS,
  agentColors,
  drawScene,
  sceneBackground,
  type AgentView,
  type SceneAgent
} from "./sprites";

type Props = {
  agents: SceneAgent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  theme: ThemeName;
  breaksEnabled?: boolean;
  seatAssignments?: Record<string, number>;
  onSeatsChange?: (seats: Record<string, number>) => void;
  pinnedAgents?: Set<string>;
};

type AgentState = {
  placement: Placement;
  motion: Motion;
};

export default function OfficeCanvas({
  agents,
  selectedId,
  onSelect,
  theme,
  breaksEnabled,
  seatAssignments = {},
  onSeatsChange,
  pinnedAgents
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const agentsRef = useRef<SceneAgent[]>(agents);
  const viewsRef = useRef<AgentView[]>([]);
  const selectedRef = useRef<string | null>(selectedId);
  const hoverRef = useRef<string | null>(null);
  const stateRef = useRef(new Map<string, AgentState>());
  const viewRef = useRef({ sx: 1, sy: 1, offsetX: 0, offsetY: 0 });
  const baseViewRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number; moved: boolean } | null>(null);
  const [size, setSize] = useState({ width: 1600, height: 900 });
  const urlMode = useMemo(() => breakMode(), []);
  const mode = breaksEnabled === false ? "off" : urlMode;

  selectedRef.current = selectedId;
  agentsRef.current = agents;

  const layout = useMemo(() => ({ width: 1600, height: 2020 }), []);
  const autoSeatOrder = useMemo(
    () =>
      SEATS.map((seat) => seat.index).sort((a, b) => {
        const aRole = SEAT_OPTIONS[a]?.role ? 1 : 0;
        const bRole = SEAT_OPTIONS[b]?.role ? 1 : 0;
        return aRole - bRole || a - b;
      }),
    []
  );

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
    const states = stateRef.current;
    const ids = new Set(agents.map((agent) => agent.id));
    const usedSeats = new Set<number>();
    const usedSpots = new Set<number>();

    for (const [id, state] of states) {
      if (!ids.has(id)) {
        states.delete(id);
        continue;
      }
      if (state.placement.seat !== null) usedSeats.add(state.placement.seat);
      if (state.placement.spot !== null) usedSpots.add(state.placement.spot);
    }

    const ordered = [...agents].sort((a, b) => Number(Boolean(b.isManager)) - Number(Boolean(a.isManager)));
    for (const agent of ordered) {
      if (states.has(agent.id)) continue;
      let seat: number | null = null;
      const assigned = seatAssignments[agent.id];
      if (
        assigned !== undefined &&
        Number.isInteger(assigned) &&
        assigned >= 0 &&
        assigned < SEATS.length &&
        !usedSeats.has(assigned)
      ) {
        seat = assigned;
        usedSeats.add(assigned);
      }
      const preferred = agent.isManager ? MANAGER_SEAT : -1;
      if (seat === null && preferred >= 0 && !usedSeats.has(preferred)) {
        seat = preferred;
        usedSeats.add(preferred);
      }
      for (const index of autoSeatOrder) {
        if (seat !== null) break;
        if (!usedSeats.has(index)) {
          seat = index;
          usedSeats.add(index);
        }
      }
      let spot: number | null = null;
      if (seat === null) {
        for (let index = 0; index < STANDING_SPOTS.length; index++) {
          if (!usedSpots.has(index)) {
            spot = index;
            usedSpots.add(index);
            break;
          }
        }
      }

      const hash = hashOf(agent.id);
      const spawnAge = agent.spawnedAt ? Date.now() - agent.spawnedAt : Number.POSITIVE_INFINITY;
      const entering = spawnAge < 2500;
      const x = entering
        ? ENTRANCE.x
        : seat !== null
          ? SEATS[seat].seatX
          : spot !== null
            ? STANDING_SPOTS[spot].x
            : overflowSpot(hash % 200).x;
      const y = entering
        ? ENTRANCE.y
        : seat !== null
          ? SEATS[seat].seatY
          : spot !== null
            ? STANDING_SPOTS[spot].y
            : overflowSpot(hash % 200).y;

      states.set(agent.id, {
        placement: {
          seat,
          spot,
          meeting: null,
          breakSpot: null,
          mode: entering ? "stand" : seat !== null ? "desk" : "stand",
          destination: entering
            ? null
            : seat !== null
              ? `seat-${seat}`
              : spot !== null
                ? `spot-${spot}`
                : `overflow-${hash % 200}`,
          nextBreakAt: performance.now() + firstBreakDelay(hash, mode),
          breakEndsAt: 0
        },
        motion: { x, y, path: [] }
      });
    }

    for (const agent of agents) {
      const state = states.get(agent.id);
      if (!state) continue;
      const assigned = seatAssignments[agent.id];
      if (
        assigned === undefined ||
        assigned === state.placement.seat ||
        !Number.isInteger(assigned) ||
        assigned < 0 ||
        assigned >= SEATS.length ||
        usedSeats.has(assigned)
      ) {
        continue;
      }
      if (state.placement.seat !== null) usedSeats.delete(state.placement.seat);
      if (state.placement.spot !== null) {
        usedSpots.delete(state.placement.spot);
        state.placement.spot = null;
      }
      state.placement.seat = assigned;
      usedSeats.add(assigned);
    }

    for (const agent of agents) {
      const state = states.get(agent.id);
      if (!state || state.placement.seat !== null) continue;
      for (const index of autoSeatOrder) {
        if (usedSeats.has(index)) continue;
        state.placement.seat = index;
        usedSeats.add(index);
        if (state.placement.spot !== null) {
          usedSpots.delete(state.placement.spot);
          state.placement.spot = null;
        }
        break;
      }
    }

    const manager = agents.find((agent) => agent.isManager);
    const managerState = manager ? states.get(manager.id) : undefined;
    const managerSeat = MANAGER_SEAT;
    const managerAssigned = manager ? seatAssignments[manager.id] : undefined;
    if (
      manager &&
      managerState &&
      managerAssigned === undefined &&
      managerState.placement.seat !== managerSeat
    ) {
      const occupant = [...states.entries()].find(
        ([id, state]) => id !== manager.id && state.placement.seat === managerSeat
      );
      const occupantAssigned = occupant ? seatAssignments[occupant[0]] !== undefined : false;
      if (!occupant || !occupantAssigned) {
        if (occupant) {
          occupant[1].placement.seat = managerState.placement.seat;
          if (occupant[1].placement.seat === null && occupant[1].placement.spot === null) {
            for (let index = 0; index < STANDING_SPOTS.length; index++) {
              if (!usedSpots.has(index)) {
                occupant[1].placement.spot = index;
                usedSpots.add(index);
                break;
              }
            }
          }
        }
        managerState.placement.seat = managerSeat;
        if (managerState.placement.spot !== null) {
          usedSpots.delete(managerState.placement.spot);
          managerState.placement.spot = null;
        }
      }
    }
  }, [agents, mode, seatAssignments]);

  useEffect(() => {
    if (!onSeatsChange) return;
    const seats: Record<string, number> = {};
    for (const [id, state] of stateRef.current) {
      if (state.placement.seat !== null) seats[id] = state.placement.seat;
    }
    onSeatsChange(seats);
  }, [agents, mode, seatAssignments, onSeatsChange]);

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

    const scale = Math.max(size.width / layout.width, size.height / layout.height);
    baseViewRef.current = {
      scale,
      offsetX: (size.width - layout.width * scale) / 2,
      offsetY: (size.height - layout.height * scale) / 2
    };

    let frame = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      let idleSeated = 0;
      for (const agent of agentsRef.current) {
        const state = stateRef.current.get(agent.id);
        if (state?.placement.seat !== null && state?.placement.seat !== undefined && agent.status === "idle") {
          idleSeated += 1;
        }
      }
      const breakerLimit = maxBreakers(idleSeated, mode);
      const usedMeeting = new Set<number>();
      const usedBreak = new Set<number>();
      for (const state of stateRef.current.values()) {
        if (state.placement.meeting !== null) usedMeeting.add(state.placement.meeting);
        if (state.placement.breakSpot !== null) usedBreak.add(state.placement.breakSpot);
      }

      const views: AgentView[] = [];
      for (const agent of agentsRef.current) {
        const state = stateRef.current.get(agent.id);
        if (!state) continue;
        const { placement, motion } = state;
        const hash = hashOf(agent.id);
        const gender = agent.gender ?? agent.look?.parts?.gender ?? (hash % 2 === 0 ? "female" : "male");
        const female = gender === "female";
        const pinned = pinnedAgents?.has(agent.id) ?? false;

        if (pinned && placement.breakSpot !== null) {
          usedBreak.delete(placement.breakSpot);
          placement.breakSpot = null;
          placement.breakEndsAt = 0;
        }

        const activeBreak = placement.breakSpot !== null && placement.breakEndsAt > now && agent.status === "idle";
        if (placement.breakSpot !== null && (!activeBreak || mode === "off")) {
          usedBreak.delete(placement.breakSpot);
          placement.breakSpot = null;
          if (placement.breakEndsAt > 0) {
            placement.breakEndsAt = 0;
            placement.nextBreakAt = now + nextBreakDelay(hash, mode);
          }
        }

        const working =
          agent.status === "thinking" ||
          agent.status === "coding" ||
          agent.status === "running_tool" ||
          agent.status === "error";
        let desired: Placement["mode"] = placement.seat !== null ? "desk" : "stand";
        if (agent.status === "talking") desired = "meeting";
        if (working && placement.seat !== null) desired = "desk";
        if (pinned && placement.seat !== null) desired = "desk";
        if (
          desired === "desk" &&
          !pinned &&
          agent.status === "idle" &&
          placement.breakSpot === null &&
          mode !== "off" &&
          now >= placement.nextBreakAt
        ) {
          if (usedBreak.size < breakerLimit) {
            let spot = -1;
            for (let index = 0; index < BREAK_SPOTS.length; index++) {
              if (usedBreak.has(index)) continue;
              const gender = BREAK_SPOTS[index].gender;
              if (gender && gender !== (female ? "female" : "male")) continue;
              spot = index;
              break;
            }
            if (spot >= 0) {
              placement.breakSpot = spot;
              placement.breakEndsAt = now + breakDuration(hash, mode);
              usedBreak.add(spot);
              desired = "break";
            } else {
              placement.nextBreakAt = now + 5000;
            }
          } else {
            placement.nextBreakAt = now + 5000;
          }
        } else if (desired === "desk" && activeBreak) {
          desired = "break";
        }

        if (desired !== "meeting" && placement.meeting !== null) {
          usedMeeting.delete(placement.meeting);
          placement.meeting = null;
        }
        if (desired === "meeting" && placement.meeting === null) {
          let spot = -1;
          for (let index = 0; index < MEETING_SPOTS.length; index++) {
            if (!usedMeeting.has(index)) {
              spot = index;
              break;
            }
          }
          if (spot >= 0) {
            placement.meeting = spot;
            usedMeeting.add(spot);
          } else {
            desired = placement.seat !== null ? "desk" : "stand";
          }
        }

        let target: Point;
        let destination: string;
        if (desired === "desk" && placement.seat !== null) {
          const seat = SEATS[placement.seat];
          target = { x: seat.seatX, y: seat.seatY };
          destination = `seat-${placement.seat}`;
        } else if (desired === "break" && placement.breakSpot !== null) {
          const spot = BREAK_SPOTS[placement.breakSpot];
          target = { x: spot.x, y: spot.y };
          destination = `break-${placement.breakSpot}`;
        } else if (desired === "meeting" && placement.meeting !== null) {
          const spot = MEETING_SPOTS[placement.meeting];
          target = { x: spot.x, y: spot.y };
          destination = `meeting-${placement.meeting}`;
        } else if (placement.spot !== null) {
          const spot = STANDING_SPOTS[placement.spot];
          target = { x: spot.x, y: spot.y };
          destination = `spot-${placement.spot}`;
          desired = "stand";
        } else {
          target = overflowSpot(hash % 200);
          destination = `overflow-${hash % 200}`;
          desired = "stand";
        }

        if (placement.mode !== desired || placement.destination !== destination) {
          const previousMode = placement.mode;
          const previousSeat = placement.seat;
          const seat =
            previousMode === "desk" && previousSeat !== null
              ? SEATS[previousSeat]
              : null;
          const atSeat =
            seat !== null && Math.hypot(motion.x - seat.seatX, motion.y - seat.seatY) < 10;
          const current = { x: motion.x, y: motion.y };
          const startAccess = atSeat && seat ? seatExit(seat) : current;
          const goalAccess =
            desired === "desk" && placement.seat !== null ? seatExit(SEATS[placement.seat]) : target;

          placement.mode = desired;
          placement.destination = destination;

          if (atSeat && seat && desired === "desk" && placement.seat === previousSeat) {
            setDestination(motion, []);
          } else {
            const path = findPath(startAccess, goalAccess);
            if (path.length > 0) {
              if (atSeat && seat) path.unshift({ x: seat.seatX, y: seat.seatY });
              if (desired === "desk" && placement.seat !== null) {
                path.push({ x: SEATS[placement.seat].seatX, y: SEATS[placement.seat].seatY });
              }
            }
            setDestination(motion, path);
          }
        }

        if (
          desired === "desk" &&
          agent.status === "idle" &&
          placement.breakSpot === null &&
          placement.breakEndsAt === 0
        ) {
          if (now >= placement.nextBreakAt) placement.nextBreakAt = now + nextBreakDelay(hash, mode);
        }

        advance(motion, dt, 120);
        const walking = motion.path.length > 0;
        const seatNow = placement.seat !== null ? SEATS[placement.seat] : null;
        const seated =
          desired === "desk" &&
          !walking &&
          seatNow !== null &&
          Math.hypot(motion.x - seatNow.seatX, motion.y - seatNow.seatY) < 10;
        views.push({
          id: agent.id,
          name: agent.name,
          status: agent.status,
          task: agent.task,
          file: agent.file,
          logs: agent.logs,
          look: agent.look,
          x: motion.x,
          y: motion.y,
          walking,
          seated,
          colors: agentColors(agent.id)
        });
      }

      const screens = new Array(WORKSTATIONS.length).fill(false);
      for (const view of views) {
        if (!view.seated) continue;
        const state = stateRef.current.get(view.id);
        const seat = state?.placement.seat;
        if (seat !== null && seat !== undefined) screens[seat] = true;
      }
      viewsRef.current = views;

      const base = baseViewRef.current;
      const currentScale = base.scale * zoomRef.current;
      const offsetX = base.offsetX + panRef.current.x;
      const offsetY = base.offsetY + panRef.current.y;
      const sx = currentScale;
      const sy = currentScale;
      viewRef.current = { sx, sy, offsetX, offsetY };

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = sceneBackground(theme);
      ctx.fillRect(0, 0, size.width, size.height);
      ctx.save();
      for (let x = -size.height; x < size.width; x += 52) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 26, 0);
        ctx.lineTo(x + 26 - size.height, size.height);
        ctx.lineTo(x - size.height, size.height);
        ctx.closePath();
        ctx.fill();
      }
      ctx.font = "bold 16px ui-monospace, Consolas, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
      ctx.fillText("EN REPARACIÓN", 108, size.height / 2);
      ctx.restore();

      ctx.translate(offsetX, offsetY);
      ctx.scale(sx, sy);
      drawScene(ctx, layout.width, layout.height, views, now, selectedRef.current, screens, hoverRef.current, theme);
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [size, layout, mode, theme]);

  const pick = (clientX: number, clientY: number): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const bounds = canvas.getBoundingClientRect();
    const view = viewRef.current;
    const x = (clientX - bounds.left - view.offsetX) / view.sx;
    const y = (clientY - bounds.top - view.offsetY) / view.sy;
    for (const agent of [...viewsRef.current].reverse()) {
      if (Math.abs(agent.x - x) < 34 && y > agent.y - 80 && y < agent.y + 20) {
        return agent.id;
      }
    }
    return null;
  };

  const suppressClickRef = useRef(false);

  const canvasPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const bounds = canvas.getBoundingClientRect();
    return { x: clientX - bounds.left, y: clientY - bounds.top };
  };

  const applyZoom = (nextZoom: number, pointX: number, pointY: number) => {
    const base = baseViewRef.current;
    const oldScale = base.scale * zoomRef.current;
    const oldOffsetX = base.offsetX + panRef.current.x;
    const oldOffsetY = base.offsetY + panRef.current.y;
    const worldX = (pointX - oldOffsetX) / oldScale;
    const worldY = (pointY - oldOffsetY) / oldScale;
    const zoom = Math.max(0.25, Math.min(4, nextZoom));
    const newScale = base.scale * zoom;
    panRef.current = {
      x: pointX - worldX * newScale - base.offsetX,
      y: pointY - worldY * newScale - base.offsetY
    };
    zoomRef.current = zoom;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const point = canvasPoint(event.clientX, event.clientY);
      const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      applyZoom(zoomRef.current * factor, point.x, point.y);
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  });

  const zoomToFit = () => {
    const base = baseViewRef.current;
    const fit = Math.min(size.width / layout.width, size.height / layout.height);
    const zoom = Math.max(0.25, fit / base.scale);
    const scale = base.scale * zoom;
    zoomRef.current = zoom;
    panRef.current = {
      x: (size.width - layout.width * scale) / 2 - base.offsetX,
      y: (size.height - layout.height * scale) / 2 - base.offsetY
    };
  };

  const zoomToFill = () => {
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
  };

  const onClick = (event: MouseEvent<HTMLCanvasElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    const id = pick(event.clientX, event.clientY);
    if (id) onSelect(id);
  };

  const onMouseDown = (event: MouseEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      panX: panRef.current.x,
      panY: panRef.current.y,
      moved: false
    };
    event.currentTarget.style.cursor = "grabbing";
  };

  const onMouseMove = (event: MouseEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (drag) {
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) {
        drag.moved = true;
        suppressClickRef.current = true;
      }
      panRef.current = { x: drag.panX + dx, y: drag.panY + dy };
      event.currentTarget.style.cursor = "grabbing";
      return;
    }
    const id = pick(event.clientX, event.clientY);
    hoverRef.current = id;
    event.currentTarget.style.cursor = id ? "pointer" : "grab";
  };

  const endDrag = (event: MouseEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.moved) suppressClickRef.current = true;
    dragRef.current = null;
    event.currentTarget.style.cursor = hoverRef.current ? "pointer" : "grab";
  };

  const onMouseLeave = (event: MouseEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.moved) suppressClickRef.current = true;
    dragRef.current = null;
    hoverRef.current = null;
    event.currentTarget.style.cursor = "grab";
  };

  const zoomButton = (label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "#f4e8cc",
        color: "#33200f",
        border: "2px solid #4b3418",
        padding: "4px 8px",
        fontFamily: "inherit",
        fontSize: 11,
        cursor: "pointer"
      }}
    >
      {label}
    </button>
  );

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        onClick={onClick}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={onMouseLeave}
        style={{ cursor: "grab" }}
      />
      <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 6, zIndex: 5 }}>
        {zoomButton("−", () => applyZoom(zoomRef.current / 1.2, size.width / 2, size.height / 2))}
        {zoomButton("+", () => applyZoom(zoomRef.current * 1.2, size.width / 2, size.height / 2))}
        {zoomButton("AJUSTAR", zoomToFit)}
        {zoomButton("LLENAR", zoomToFill)}
      </div>
    </div>
  );
}
