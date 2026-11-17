export type HairStyle = "short" | "long" | "twin" | "spiky";
export type Accessory = "none" | "glasses" | "headband" | "cape" | "star";

export type CharacterParts = {
  hair: HairStyle;
  hairColor: string;
  shirt: string;
  skin: string;
  accessory: Accessory;
  gender?: "male" | "female";
};

export type CharacterLook = {
  name?: string;
  avatar?: string;
  parts?: CharacterParts;
};

export type BuiltinAvatar = {
  id: string;
  label: string;
  hint: string;
};

export const BUILTIN_AVATARS: BuiltinAvatar[] = [
  { id: "default", label: "Original", hint: "Generado a partir del id" },
  { id: "ninja", label: "Ninja", hint: "Traje oscuro y cinta" },
  { id: "idol", label: "Idol", hint: "Coletas y estrella" },
  { id: "scientist", label: "Científico", hint: "Bata y gafas" },
  { id: "hero", label: "Héroe", hint: "Capa y pelo puntiagudo" },
  { id: "samurai", label: "Samurái", hint: "Moño y hombreras" },
  { id: "mage", label: "Maga", hint: "Sombrero puntiagudo" },
  { id: "mecha", label: "Piloto", hint: "Visor y antena" },
  { id: "goth", label: "Gótico", hint: "Flequillo y gargantilla" }
];

export const HAIR_STYLES: Array<{ id: HairStyle; label: string }> = [
  { id: "short", label: "Corto" },
  { id: "long", label: "Largo" },
  { id: "twin", label: "Coletas" },
  { id: "spiky", label: "Puntas" }
];

export const ACCESSORIES: Array<{ id: Accessory; label: string }> = [
  { id: "none", label: "Ninguno" },
  { id: "glasses", label: "Gafas" },
  { id: "headband", label: "Cinta" },
  { id: "cape", label: "Capa" },
  { id: "star", label: "Estrella" }
];

export const SKIN_TONES = ["#f0c090", "#e8b98f", "#d79a6a", "#b97a4e", "#8d5a38"];

export const DEFAULT_PARTS: CharacterParts = {
  hair: "short",
  hairColor: "#5b3520",
  shirt: "#2e7d5b",
  skin: "#e8b98f",
  accessory: "none"
};

const KEY = "pixel-office-characters";

export function loadCharacters(): Record<string, CharacterLook> {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, CharacterLook>) : {};
  } catch {
    return {};
  }
}

export function saveCharacters(value: Record<string, CharacterLook>): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function isBuiltinAvatar(id: string | undefined): boolean {
  return Boolean(id) && BUILTIN_AVATARS.some((item) => item.id === id);
}

export function isImageAvatar(id: string | undefined): boolean {
  return Boolean(id) && !isBuiltinAvatar(id) && /^(data:|https?:|\/)/.test(id as string);
}
