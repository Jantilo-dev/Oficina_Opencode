import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import type { Activity, Session, SessionStatus } from "../types";
import type { CharacterLook } from "../characters";
import { displayTitle, tailTitle } from "../format";
import { computeLayout } from "./layout";
import { actionFor, colorFor, drawOffice, type Action, type DrawAgent, type ThemeName } from "./sprites";

type Props = {
  sessions: Session[];
  statuses: Record<string, SessionStatus>;
  activity: Record<string, Activity>;
  permissions: Record<string, string>;
  errors: Record<string, string>;
  spawned: Record<string, number>;
  theme: ThemeName;
  managerId?: string | null;
  characters: Record<string, CharacterLook>;
  selected: string | null;
  onSelect: (id: string) => void;
};

export default function OfficeCanvas(props: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const agentsRef = useRef<DrawAgent[]>([]);
  const selectedRef = useRef<string | null>(props.selected);
  selectedRef.current = props.selected;

  const layout = useMemo(() => computeLayout(props.sessions, props.managerId), [props.sessions, props.managerId]);
  const [size, setSize] = useState({ width: layout.width, height: layout.height });
  const viewRef = useRef({ sx: 1, sy: 1, offsetX: 0, offsetY: 0 });

  const agents = useMemo<DrawAgent[]>(
    () =>
      props.sessions.map((session) => {
        const status = props.statuses[session.id] ?? { type: "idle" as const };
        const activity = props.activity[session.id];
        const permission = props.permissions[session.id];
        const error = props.errors[session.id];
        const slot = layout.slots.get(session.id) ?? { x: 180, y: 190, scale: 1 };
        const action: Action = error
          ? "error"
          : permission
            ? "permission"
            : status.type === "retry"
              ? "retry"
              : status.type === "busy"
                ? actionFor(activity?.tool)
                : "idle";
        return {
          id: session.id,
          name:
            props.characters[session.id]?.name?.trim() ||
            (session.parentID ? tailTitle(session.title, 11) : displayTitle(session.title)),
          title: session.parentID ? tailTitle(session.title, 11) : displayTitle(session.title),
          directory: session.directory,
          action,
          tool: activity?.tool,
          x: slot.x,
          y: slot.y,
          scale: slot.scale,
          child: Boolean(session.parentID),
          spawnAt: props.spawned[session.id],
          look: props.characters[session.id]?.avatar,
          dir: slot.dir ?? 1,
          parts: props.characters[session.id]?.parts,
          color: colorFor(session.id)
        };
      }),
    [props.sessions, props.statuses, props.activity, props.permissions, props.errors, props.spawned, props.characters, layout]
  );

  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const update = () => {
      const bounds = element.getBoundingClientRect();
      setSize({
        width: Math.max(320, Math.floor(bounds.width)),
        height: Math.max(240, Math.floor(bounds.height))
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [layout]);

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

    const loop = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#1c1c1c";
      ctx.fillRect(0, 0, size.width, size.height);
      ctx.translate(offsetX, offsetY);
      ctx.scale(sx, sy);
      drawOffice(
        ctx,
        layout.width,
        layout.height,
        agentsRef.current,
        layout.labels,
        t,
        selectedRef.current,
        props.theme
      );
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [size, layout, props.theme]);

  const onClick = (event: MouseEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const view = viewRef.current;
    const x = (event.clientX - bounds.left - view.offsetX) / view.sx;
    const y = (event.clientY - bounds.top - view.offsetY) / view.sy;
    for (const agent of [...agentsRef.current].reverse()) {
      const halfWidth = 78 * agent.scale;
      if (
        x >= agent.x - halfWidth &&
        x <= agent.x + halfWidth &&
        y >= agent.y - 108 * agent.scale &&
        y <= agent.y + 50 * agent.scale
      ) {
        props.onSelect(agent.id);
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
