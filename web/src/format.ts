export function displayTitle(title: string | undefined): string {
  const cleaned = (title ?? "").replace(/\s*\(@[^)]*\)\s*$/, "").trim();
  return cleaned || "(sin título)";
}

export function tailTitle(title: string, max: number): string {
  const clean = displayTitle(title);
  if (clean.length <= max) return clean;
  return `…${clean.slice(clean.length - (max - 1))}`;
}
