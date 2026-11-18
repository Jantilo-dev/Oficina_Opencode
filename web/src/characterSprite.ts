import { isImageAvatar, type CharacterLook, type CharacterParts } from "./characters";

export type SpriteColors = {
  shirt: string;
  shirtDark: string;
  hair: string;
  skin: string;
  pants: string;
};

export type SpriteOptions = {
  x: number;
  y: number;
  colors: SpriteColors;
  parts?: CharacterParts;
  look?: CharacterLook;
  gender?: "male" | "female";
  pose: "stand" | "sit";
  facing?: 1 | -1;
  status?: string;
  walking?: boolean;
  time?: number;
};

const OUTLINE = "#1a2430";
const WHITE = "#f4f6f8";
const SKIN_LIP = "#a35a44";
const SHOE = "#161b22";

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function shade(color: string, factor: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color;
  const value = Number.parseInt(color.slice(1), 16);
  const r = Math.max(0, Math.min(255, Math.round(((value >> 16) & 255) * factor)));
  const g = Math.max(0, Math.min(255, Math.round(((value >> 8) & 255) * factor)));
  const b = Math.max(0, Math.min(255, Math.round((value & 255) * factor)));
  return `rgb(${r} ${g} ${b})`;
}

const avatarCache = new Map<string, HTMLImageElement>();

function avatarImage(src: string): HTMLImageElement | null {
  if (typeof window === "undefined") return null;
  let image = avatarCache.get(src);
  if (!image) {
    image = new Image();
    image.src = src;
    avatarCache.set(src, image);
  }
  return image.complete && image.naturalWidth > 0 ? image : null;
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  src: string,
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  const image = avatarImage(src);
  if (!image) return false;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, Math.round(x), Math.round(y), Math.round(width), Math.round(height));
  return true;
}

type HeadOptions = {
  top: number;
  style: CharacterParts["hair"] | undefined;
  hair: string;
  hairDark: string;
  skin: string;
  skinDark: string;
  accessory: CharacterParts["accessory"] | undefined;
  lookDown: boolean;
  lookRight?: boolean;
  blink: boolean;
  thinking: boolean;
};

function drawHead(ctx: CanvasRenderingContext2D, x: number, options: HeadOptions) {
  const { top, style, hair, hairDark, skin, skinDark, accessory, lookDown, lookRight, blink, thinking } = options;

  if (style === "long") {
    rect(ctx, x - 12, top + 4, 3, 18, hairDark);
    rect(ctx, x + 10, top + 4, 3, 18, hairDark);
    rect(ctx, x - 11, top + 5, 2, 15, hair);
    rect(ctx, x + 10, top + 5, 2, 15, hair);
  } else if (style === "twin") {
    rect(ctx, x - 14, top + 9, 4, 12, hairDark);
    rect(ctx, x + 11, top + 9, 4, 12, hairDark);
    rect(ctx, x - 13, top + 8, 2, 3, hair);
    rect(ctx, x + 12, top + 8, 2, 3, hair);
  }

  if (style === "spiky") {
    rect(ctx, x - 8, top - 3, 4, 4, hair);
    rect(ctx, x - 2, top - 4, 4, 5, hair);
    rect(ctx, x + 4, top - 3, 4, 4, hair);
    rect(ctx, x + 9, top - 1, 3, 3, hair);
  }

  rect(ctx, x - 10, top, 20, 21, OUTLINE);
  rect(ctx, x - 9, top + 1, 18, 19, hairDark);
  rect(ctx, x - 8, top + 3, 16, 17, skin);
  rect(ctx, x - 11, top + 9, 2, 4, skinDark);
  rect(ctx, x + 9, top + 9, 2, 4, skinDark);
  rect(ctx, x - 3, top + 20, 6, 3, skinDark);

  rect(ctx, x - 9, top, 18, 5, hair);
  rect(ctx, x - 9, top + 4, 3, 9, hair);
  rect(ctx, x + 6, top + 4, 3, 9, hair);
  rect(ctx, x - 7, top + 4, 14, 3, hair);
  rect(ctx, x - 8, top + 1, 12, 2, shade(hair, 1.18));
  rect(ctx, x - 1, top + 4, 2, 2, hairDark);

  if (style === "long") {
    rect(ctx, x - 8, top + 6, 2, 12, hair);
    rect(ctx, x + 6, top + 6, 2, 12, hair);
  } else if (style === "twin") {
    rect(ctx, x - 12, top + 10, 2, 8, hair);
    rect(ctx, x + 10, top + 10, 2, 8, hair);
  }

  const eyeY = top + 10 + (lookDown ? 1 : 0);
  if (!blink) {
    rect(ctx, x - 6, eyeY, 3, 2, WHITE);
    rect(ctx, x + 3, eyeY, 3, 2, WHITE);
    const pupilX = (thinking ? 1 : 0) + (lookRight ? 1 : 0);
    rect(ctx, x - 5 + pupilX, eyeY, 1, 2, OUTLINE);
    rect(ctx, x + 4 + pupilX, eyeY, 1, 2, OUTLINE);
  } else {
    rect(ctx, x - 6, eyeY + 1, 3, 1, OUTLINE);
    rect(ctx, x + 3, eyeY + 1, 3, 1, OUTLINE);
  }
  rect(ctx, x - 6, eyeY - 2, 3, 1, hairDark);
  rect(ctx, x + 3, eyeY - 2, 3, 1, hairDark);
  rect(ctx, x - 1, eyeY + 2, 2, 2, skinDark);
  rect(ctx, x - 1, eyeY + 5, 3, 1, SKIN_LIP);
  rect(ctx, x + 2, eyeY + 4, 1, 1, SKIN_LIP);
  rect(ctx, x + 3, top + 16, 2, 1, skinDark);

  if (accessory === "glasses") {
    rect(ctx, x - 7, eyeY - 1, 5, 4, OUTLINE);
    rect(ctx, x + 2, eyeY - 1, 5, 4, OUTLINE);
    rect(ctx, x - 6, eyeY, 3, 2, "#a8d6e8");
    rect(ctx, x + 3, eyeY, 3, 2, "#a8d6e8");
    rect(ctx, x - 2, eyeY + 1, 4, 1, OUTLINE);
  }
  if (accessory === "headband") {
    rect(ctx, x - 10, top + 6, 20, 2, "#c0392b");
    rect(ctx, x + 8, top + 8, 3, 5, "#c0392b");
  }
}

function drawTorso(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  colors: SpriteColors,
  shirt: string,
  shirtDark: string,
  skin: string,
  pose: "stand" | "sit",
  swing: number,
  status: string | undefined,
  accessory: CharacterParts["accessory"] | undefined
) {
  const seated = pose === "sit";
  const typing = status === "coding" || status === "running_tool";
  const thinking = status === "thinking";
  const handLift = thinking ? -3 : 0;

  if (accessory === "cape") {
    rect(ctx, x - 11, top + 2, 4, 17, "#a52d2d");
    rect(ctx, x + 7, top + 2, 4, 17, "#a52d2d");
  }
  if (seated) {
    rect(ctx, x - 15, top - 12, 4, 42, "#3a4658");
    rect(ctx, x + 11, top - 12, 4, 42, "#3a4658");
    rect(ctx, x - 15, top - 12, 30, 4, "#586a7f");
    rect(ctx, x - 11, top - 16, 22, 4, "#4b586b");
    rect(ctx, x - 12, top + 18, 24, 5, "#2b323c");
  }

  rect(ctx, x - 10, top, 20, 19, OUTLINE);
  rect(ctx, x - 8, top + 2, 16, 16, shirt);
  rect(ctx, x - 8, top + 2, 3, 16, shirtDark);
  rect(ctx, x + 5, top + 2, 3, 16, shade(shirt, 1.12));
  rect(ctx, x - 2, top + 2, 4, 11, WHITE);
  rect(ctx, x - 3, top + 2, 6, 2, WHITE);
  rect(ctx, x - 1, top + 13, 2, 3, shirtDark);
  rect(ctx, x - 8, top + 16, 16, 2, shade(colors.pants, 0.9));
  if (seated) rect(ctx, x - 7, top + 18, 14, 12, colors.pants);

  if (accessory === "star") {
    rect(ctx, x + 1, top + 7, 4, 4, "#f2c24a");
    rect(ctx, x + 2, top + 6, 2, 6, "#f2c24a");
    rect(ctx, x, top + 8, 6, 2, "#f2c24a");
  }

  if (!seated && thinking) {
    rect(ctx, x - 12, top + 4, 3, 9, shirt);
    rect(ctx, x - 12, top + 12, 3, 3, skin);
    rect(ctx, x + 9, top + 4 + swing, 3, 7, shirt);
    rect(ctx, x + 7, top + 9 + handLift, 4, 3, shirtDark);
    rect(ctx, x + 6, top + 11 + handLift, 4, 3, skin);
  } else if (!seated) {
    rect(ctx, x - 12, top + 4 + swing, 3, 10, shirt);
    rect(ctx, x + 9, top + 4 - swing, 3, 10, shirt);
    rect(ctx, x - 12, top + 13 + swing, 4, 3, skin);
    rect(ctx, x + 8, top + 13 - swing, 4, 3, skin);
  }
}

function drawLegs(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  colors: SpriteColors,
  skin: string,
  gender: "male" | "female",
  swing: number,
  walking: boolean
) {
  const step = walking ? swing : 0;
  if (gender === "female") {
    rect(ctx, x - 9, baseY - 18, 18, 8, colors.pants);
    rect(ctx, x - 8, baseY - 17, 16, 2, shade(colors.pants, 1.15));
    rect(ctx, x - 6 + step, baseY - 10, 4, 8, skin);
    rect(ctx, x + 2 - step, baseY - 10, 4, 8, skin);
    rect(ctx, x - 7 + step, baseY - 3, 6, 3, SHOE);
    rect(ctx, x + 1 - step, baseY - 3, 6, 3, SHOE);
  } else {
    rect(ctx, x - 7 + step, baseY - 17, 6, 14, colors.pants);
    rect(ctx, x + 1 - step, baseY - 17, 6, 14, shade(colors.pants, 1.15));
    rect(ctx, x - 8 + step, baseY - 4, 7, 4, SHOE);
    rect(ctx, x + 1 - step, baseY - 4, 7, 4, SHOE);
  }
}

function drawSeatedSide(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  colors: SpriteColors,
  shirt: string,
  shirtDark: string,
  skin: string,
  hair: string,
  hairDark: string,
  style: CharacterParts["hair"] | undefined,
  accessory: CharacterParts["accessory"] | undefined,
  status: string | undefined,
  time: number,
  facing: 1 | -1
) {
  const bob = status === "thinking" ? Math.sin(time / 400 + x) * 0.8 : 0;
  const top = Math.round(baseY - 48 + bob);
  const bodyTop = Math.round(baseY - 30 + bob);
  const skinDark = shade(skin, 0.82);
  const typing = status === "coding" || status === "running_tool";

  ctx.save();
  ctx.translate(x, 0);
  ctx.scale(facing, 1);

  rect(ctx, -14, bodyTop - 4, 4, 32, "#3a4658");
  rect(ctx, -14, bodyTop - 4, 8, 3, "#4b586b");

  if (style === "long") {
    rect(ctx, -11, top + 4, 4, 19, hairDark);
    rect(ctx, -10, top + 5, 3, 16, hair);
  } else if (style === "twin") {
    rect(ctx, -13, top + 9, 4, 12, hairDark);
    rect(ctx, -12, top + 8, 2, 3, hair);
  }
  if (style === "spiky") {
    rect(ctx, -7, top - 3, 3, 4, hair);
    rect(ctx, -2, top - 4, 3, 5, hair);
    rect(ctx, 3, top - 3, 3, 4, hair);
  }
  if (accessory === "cape") rect(ctx, -10, bodyTop + 2, 4, 18, "#a52d2d");

  rect(ctx, -8, bodyTop, 16, 20, OUTLINE);
  rect(ctx, -7, bodyTop + 1, 14, 18, shirt);
  rect(ctx, -7, bodyTop + 1, 5, 18, shirtDark);
  rect(ctx, 4, bodyTop + 1, 3, 18, shade(shirt, 1.12));
  rect(ctx, -1, bodyTop + 1, 3, 9, WHITE);
  rect(ctx, -7, bodyTop + 17, 14, 3, shade(colors.pants, 0.9));
  rect(ctx, -7, bodyTop + 19, 15, 5, colors.pants);
  rect(ctx, -7, bodyTop + 22, 15, 10, colors.pants);

  rect(ctx, 6, bodyTop + 5, 7, 4, shirt);
  rect(ctx, 12, bodyTop + 6, 3, 3, shirtDark);
  rect(ctx, 13, bodyTop + 8, 3, 3, skin);

  if (accessory === "star") {
    rect(ctx, 0, bodyTop + 6, 4, 4, "#f2c24a");
    rect(ctx, 1, bodyTop + 5, 2, 6, "#f2c24a");
    rect(ctx, -1, bodyTop + 7, 6, 2, "#f2c24a");
  }

  rect(ctx, -9, top, 19, 21, OUTLINE);
  rect(ctx, -8, top + 1, 17, 19, skin);
  rect(ctx, -10, top, 8, 21, hair);
  rect(ctx, -9, top, 17, 4, hair);
  rect(ctx, -9, top + 3, 4, 10, hair);
  rect(ctx, -8, top + 1, 12, 2, shade(hair, 1.16));
  rect(ctx, -4, top + 9, 2, 4, skinDark);
  rect(ctx, 6, top + 10, 3, 3, skin);
  rect(ctx, 8, top + 10, 1, 2, skinDark);

  const blink = Math.sin(time / 1600 + x) > 0.965;
  if (!blink) {
    rect(ctx, 2, top + 10, 3, 2, WHITE);
    rect(ctx, 4, top + 10, 1, 2, OUTLINE);
  } else {
    rect(ctx, 2, top + 11, 3, 1, OUTLINE);
  }
  rect(ctx, 2, top + 8, 4, 1, hairDark);
  rect(ctx, 4, top + 14, 4, 1, SKIN_LIP);
  rect(ctx, -9, top + 20, 7, 2, skinDark);

  if (accessory === "glasses") {
    rect(ctx, 1, top + 8, 6, 4, OUTLINE);
    rect(ctx, 2, top + 9, 3, 2, "#a8d6e8");
    rect(ctx, 6, top + 9, 1, 1, OUTLINE);
  }
  if (accessory === "headband") {
    rect(ctx, -9, top + 5, 17, 2, "#c0392b");
    rect(ctx, -10, top + 5, 2, 6, "#c0392b");
  }

  if (status === "thinking") {
    rect(ctx, 5, bodyTop + 4, 3, 8, shirt);
    rect(ctx, 6, bodyTop - 1, 3, 7, shirtDark);
    rect(ctx, 5, bodyTop - 4, 4, 3, skin);
    rect(ctx, 7, bodyTop - 2, 2, 2, skin);
  } else if (typing) {
    rect(ctx, 11, bodyTop + 9, 4, 2, skin);
    rect(ctx, 13, bodyTop + 8, 1, 1, WHITE);
  }

  if (status === "error") {
    rect(ctx, -10, top, 20, bodyTop - top + 21, "#b3342f33");
  }

  ctx.restore();
}

export type DeskArmsOptions = {
  x: number;
  y: number;
  colors: SpriteColors;
  parts?: CharacterParts;
  active?: boolean;
  time?: number;
};

export function drawDeskArms(ctx: CanvasRenderingContext2D, options: DeskArmsOptions) {
  const { x, y, colors, parts, active = false, time = 0 } = options;
  const skin = parts?.skin ?? colors.skin ?? "#e8b98f";
  const shirt = parts?.shirt ?? colors.shirt ?? "#2e7d5b";
  const shirtDark = parts?.shirt ? shade(parts.shirt, 0.72) : colors.shirtDark ?? "#1f5a40";
  const baseY = Math.round(y);
  const jitter = active ? Math.round(Math.sin(time / 120 + x) * 1) : 0;
  const mouseShift = active ? Math.round(Math.sin(time / 220 + x) * 2) : 0;

  rect(ctx, x - 10, baseY - 26, 3, 8, shirt);
  rect(ctx, x - 9, baseY - 19, 3, 4, shirtDark);
  rect(ctx, x - 9, baseY - 7, 6, 3, shirtDark);
  rect(ctx, x - 3, baseY - 7, 3, 3, skin);
  rect(ctx, x - 4, baseY - 4, 4, 4, skin);
  rect(ctx, x - 3, baseY - 1, 4, 4, skin);

  rect(ctx, x + 8, baseY - 26, 3, 8, shirt);
  rect(ctx, x + 9, baseY - 19, 3, 4, shirtDark);
  rect(ctx, x + 11, baseY - 7, 8, 3, shirtDark);
  rect(ctx, x + 19, baseY - 7, 5, 3, skin);
  rect(ctx, x + 22, baseY - 4, 4, 4, skin);
  rect(ctx, x + 23 + mouseShift, baseY - 1, 5, 4, skin);

  if (active) {
    rect(ctx, x - 3 + jitter, baseY - 1, 2, 1, WHITE);
    rect(ctx, x + 25 + mouseShift, baseY - 1, 2, 1, WHITE);
  }
}

export function drawPerson(ctx: CanvasRenderingContext2D, options: SpriteOptions) {
  const { x, y, colors, parts, look, pose, status, walking = false, time = 0 } = options;
  const seated = pose === "sit";
  const skin = parts?.skin ?? colors.skin ?? "#e8b98f";
  const skinDark = shade(skin, 0.82);
  const hair = parts?.hairColor ?? colors.hair ?? "#5b3520";
  const hairDark = shade(hair, 0.72);
  const shirt = parts?.shirt ?? colors.shirt ?? "#2e7d5b";
  const shirtDark = parts?.shirt ? shade(parts.shirt, 0.72) : colors.shirtDark ?? "#1f5a40";
  const gender = parts?.gender ?? options.gender ?? "male";
  const style = parts?.hair ?? (look?.avatar ? undefined : gender === "female" ? "long" : "short");
  const phase = time / 100 + x * 0.35;
  const swing = walking ? Math.round(Math.sin(phase) * 2) : 0;
  const bob = walking ? Math.abs(Math.sin(phase)) : 0;
  const baseY = Math.round(y - bob);
  const headTop = baseY - (seated ? 46 : 52);
  const torsoTop = baseY - (seated ? 28 : 31);

  rect(ctx, x - 13, baseY + 1, 26, 4, "#00000024");
  if (look?.avatar && isImageAvatar(look.avatar) && drawAvatar(ctx, look.avatar, x - 15, headTop - 2, 30, seated ? 48 : 52)) {
    if (status === "error") rect(ctx, x - 15, headTop - 2, 30, seated ? 48 : 52, "#b3342f33");
    return;
  }

  if (!seated) drawLegs(ctx, x, baseY, colors, skin, gender, swing, walking);
  drawTorso(ctx, x, torsoTop, colors, shirt, shirtDark, skin, pose, swing, status, parts?.accessory);
  drawHead(ctx, x, {
    top: headTop,
    style,
    hair,
    hairDark,
    skin,
    skinDark,
    accessory: parts?.accessory,
    lookDown: seated || status === "coding" || status === "running_tool",
    lookRight: seated,
    blink: Math.sin(time / 1600 + x) > 0.965,
    thinking: status === "thinking"
  });

  if (status === "error") {
    rect(ctx, x - 11, torsoTop, 22, baseY - torsoTop + 2, "#b3342f2a");
  }
}
