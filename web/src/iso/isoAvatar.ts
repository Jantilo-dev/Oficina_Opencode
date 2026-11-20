import type { CharacterLook, CharacterParts } from "../characters";
import type { SpriteColors } from "../characterSprite";
import { shade } from "./projection";

export type IsoStatus = "idle" | "thinking" | "coding" | "running_tool" | "talking" | "error";

export type IsoAgent = {
  id: string;
  name: string;
  role: string;
  status: IsoStatus;
  look?: CharacterLook;
  colors: SpriteColors;
};

type CatPalette = {
  fur: string;
  furDark: string;
  furLight: string;
  shirt: string;
  shirtDark: string;
  skin: string;
  skinDark: string;
  accessory: CharacterParts["accessory"];
  style: CharacterParts["hair"] | undefined;
};

function palette(agent: IsoAgent): CatPalette {
  const parts = agent.look?.parts;
  const fur = parts?.hairColor ?? agent.colors.hair;
  const skin = parts?.skin ?? agent.colors.skin;
  const shirt = parts?.shirt ?? agent.colors.shirt;
  return {
    fur,
    furDark: shade(fur, 0.72),
    furLight: shade(fur, 1.18),
    shirt,
    shirtDark: parts?.shirt ? shade(parts.shirt, 0.72) : agent.colors.shirtDark,
    skin,
    skinDark: shade(skin, 0.82),
    accessory: parts?.accessory ?? "none",
    style: parts?.hair
  };
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function cat(ctx: CanvasRenderingContext2D, x: number, top: number, p: CatPalette, busy: boolean, error: boolean, blink: boolean) {
  const eyeY = top + 10;
  const pupil = busy ? 1 : 0;

  if (p.style === "long") {
    rect(ctx, x - 12, top + 5, 2, 15, p.furDark);
    rect(ctx, x + 10, top + 5, 2, 15, p.furDark);
  } else if (p.style === "twin") {
    rect(ctx, x - 14, top + 8, 3, 10, p.furDark);
    rect(ctx, x + 11, top + 8, 3, 10, p.furDark);
  }

  rect(ctx, x - 10, top - 3, 5, 4, "#2a1a10");
  rect(ctx, x - 9, top - 4, 3, 1, "#2a1a10");
  rect(ctx, x - 8, top - 5, 1, 1, "#2a1a10");
  rect(ctx, x - 9, top - 3, 3, 2, p.fur);
  rect(ctx, x - 8, top - 4, 1, 1, p.fur);
  rect(ctx, x - 8, top - 1, 1, 2, "#d77b8f");
  rect(ctx, x + 5, top - 3, 5, 4, "#2a1a10");
  rect(ctx, x + 6, top - 4, 3, 1, "#2a1a10");
  rect(ctx, x + 7, top - 5, 1, 1, "#2a1a10");
  rect(ctx, x + 6, top - 3, 3, 2, p.fur);
  rect(ctx, x + 7, top - 4, 1, 1, p.fur);
  rect(ctx, x + 7, top - 1, 1, 2, "#d77b8f");

  rect(ctx, x - 10, top, 20, 21, "#2a1a10");
  rect(ctx, x - 9, top + 1, 18, 19, p.fur);
  rect(ctx, x - 8, top + 1, 14, 3, p.furLight);
  rect(ctx, x - 9, top + 1, 2, 17, p.furDark);
  rect(ctx, x + 7, top + 1, 2, 17, p.furDark);
  rect(ctx, x - 6, top + 5, 12, 2, p.furLight);
  rect(ctx, x - 4, top + 18, 8, 2, p.furDark);

  rect(ctx, x + 4, top + 9, 6, 9, p.skin);
  rect(ctx, x + 5, top + 8, 4, 2, p.skinDark);
  rect(ctx, x + 8, top + 12, 2, 3, p.skinDark);
  rect(ctx, x + 8, top + 14, 2, 1, "#d77b8f");
  rect(ctx, x + 9, top + 16, 2, 1, "#2a1a10");

  if (!blink) {
    rect(ctx, x + 6, eyeY, 2, 3, "#f2d24a");
    rect(ctx, x + 7 + pupil, eyeY, 1, 3, "#1a2430");
    rect(ctx, x + 6, eyeY, 1, 1, "#ffffff");
  } else {
    rect(ctx, x + 6, eyeY + 1, 2, 1, "#1a2430");
  }
  rect(ctx, x + 5, eyeY - 2, 3, 1, p.furDark);
  rect(ctx, x + 9, top + 17, 3, 1, "#f4e8cc");

  if (p.accessory === "glasses") {
    rect(ctx, x + 5, eyeY - 1, 5, 5, "#1a2430");
    rect(ctx, x + 6, eyeY, 3, 3, "#a8d6e8");
  }
  if (p.accessory === "headband") {
    rect(ctx, x - 10, top + 5, 20, 2, "#c0392b");
  }
  if (error) {
    rect(ctx, x - 11, top - 4, 22, 25, "#b3342f33");
  }
}

export function drawIsoAgent(
  ctx: CanvasRenderingContext2D,
  agent: IsoAgent,
  px: number,
  py: number,
  time: number,
  selected: boolean
) {
  const p = palette(agent);
  const busy = agent.status === "coding" || agent.status === "running_tool";
  const typing = busy ? Math.sin(time / 110) : 0;
  const x = Math.round(px);
  const bob =
    Math.sin(time / 900 + x) * 0.6 +
    (agent.status === "thinking" ? Math.sin(time / 400) * 1 : 0);
  const base = Math.round(py + bob);

  ctx.save();
  ctx.fillStyle = "#1f294033";
  ctx.beginPath();
  ctx.ellipse(x, base + 5, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  rect(ctx, x - 16, base - 34, 4, 30, "#565b82");
  rect(ctx, x + 12, base - 34, 4, 30, "#565b82");
  rect(ctx, x - 16, base - 36, 32, 4, "#7a7fa8");

  const sway = Math.round(Math.sin(time / 480 + x) * 2);
  rect(ctx, x + 10, base - 21, 4, 9, p.fur);
  rect(ctx, x + 14, base - 17 + sway, 5, 4, p.fur);
  rect(ctx, x + 18, base - 14 + sway, 3, 3, p.furDark);

  rect(ctx, x - 9, base - 27, 18, 22, "#1a2430");
  rect(ctx, x - 7, base - 25, 14, 19, p.shirt);
  rect(ctx, x - 7, base - 25, 2, 19, p.shirtDark);
  rect(ctx, x + 6, base - 25, 2, 19, shade(p.shirt, 1.15));
  rect(ctx, x - 1, base - 25, 2, 16, p.shirtDark);
  rect(ctx, x - 4, base - 25, 8, 2, p.shirtDark);
  rect(ctx, x - 8, base - 8, 16, 4, p.shirtDark);
  rect(ctx, x - 7, base - 7, 5, 15, p.furDark);
  rect(ctx, x + 3, base - 7, 5, 15, p.fur);
  rect(ctx, x - 8, base + 5, 6, 3, p.furDark);
  rect(ctx, x + 2, base + 5, 6, 3, p.furLight);

  rect(ctx, x - 12, base - 22 + typing, 3, 10, p.shirt);
  rect(ctx, x + 9, base - 22 - typing, 3, 10, p.shirt);
  rect(ctx, x - 13, base - 13 + typing, 5, 3, p.skin);
  rect(ctx, x + 8, base - 13 - typing, 5, 3, p.skin);
  rect(ctx, x - 11, base - 12, 3, 4, p.skin);
  rect(ctx, x + 8, base - 12, 3, 4, p.skin);

  cat(ctx, x, base - 46, p, busy, agent.status === "error", Math.sin(time / 1700 + x) > 0.965);
  ctx.fillStyle = "#7fd0e810";
  ctx.fillRect(x - 8, base - 44, 16, 10);

  if (selected) {
    ctx.strokeStyle = "#f2c24a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, base + 2, 22, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.font = "bold 10px ui-monospace, Consolas, monospace";
  const label = agent.name.length > 20 ? `${agent.name.slice(0, 19)}…` : agent.name;
  const width = ctx.measureText(label).width + 14;
  const labelY = base - 66;
  rect(ctx, x - width / 2 - 2, labelY - 13, width + 4, 19, selected ? "#f2c24a" : "#252c36");
  rect(ctx, x - width / 2, labelY - 11, width, 15, selected ? "#ffe9a8" : "#33405a");
  rect(ctx, x - width / 2 + 4, labelY - 7, 4, 4, p.shirt);
  ctx.fillStyle = selected ? "#252c36" : "#f4f6f8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + 2, labelY - 3);

  const dot = agent.status === "error" ? "#d05050" : busy ? "#37a06a" : "#b8a888";
  rect(ctx, x + width / 2 - 8, labelY - 7, 4, 4, dot);
  ctx.restore();
}
