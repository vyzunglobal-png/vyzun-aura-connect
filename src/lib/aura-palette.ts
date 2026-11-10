/**
 * Persona palette: reads the dominant hues of a portrait and maps them to
 * VYZUN's named luxury aura colors (all defined as CSS tokens in styles.css).
 */
export type AuraColor = { name: string; token: string };

export const AURA_COLORS: { name: string; token: string; hue: number }[] = [
  { name: "Ember Coral", token: "var(--aura-coral)", hue: 15 },
  { name: "Stellar Gold", token: "var(--aura-gold)", hue: 50 },
  { name: "Jade Pulse", token: "var(--aura-jade)", hue: 150 },
  { name: "Neon Aqua", token: "var(--aura-aqua)", hue: 190 },
  { name: "Ice Sapphire", token: "var(--aura-sapphire)", hue: 225 },
  { name: "Mythic Violet", token: "var(--aura-violet)", hue: 270 },
  { name: "Cosmic Rose", token: "var(--aura-rose)", hue: 320 },
];

export const DEFAULT_PALETTE: AuraColor[] = ["Mythic Violet", "Neon Aqua", "Cosmic Rose", "Stellar Gold"].map(
  (name) => AURA_COLORS.find((c) => c.name === name)!,
);

const hueDistance = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/** Pure: weighted hue samples → 4 distinct named colors, filling from the house palette. */
export function paletteFromHues(samples: { hue: number; weight: number }[]): AuraColor[] {
  const score = new Map<string, number>();
  for (const s of samples) {
    const nearest = AURA_COLORS.reduce((best, c) => (hueDistance(c.hue, s.hue) < hueDistance(best.hue, s.hue) ? c : best));
    score.set(nearest.name, (score.get(nearest.name) ?? 0) + s.weight);
  }
  const picked = [...score.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => AURA_COLORS.find((c) => c.name === name)!);
  for (const fallback of DEFAULT_PALETTE) if (!picked.some((p) => p.name === fallback.name)) picked.push(fallback);
  return picked.slice(0, 4).map(({ name, token }) => ({ name, token }));
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return { h, s, l };
}

/** Browser-only: samples a portrait on a tiny canvas. Falls back to the house palette. */
export async function analyzePortraitPalette(src: string | null | undefined): Promise<AuraColor[]> {
  if (!src || typeof document === "undefined") return DEFAULT_PALETTE;
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    await img.decode();
    const size = 32;
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return DEFAULT_PALETTE;
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const samples: { hue: number; weight: number }[] = [];
    for (let i = 0; i < data.length; i += 4) {
      const { h, s, l } = rgbToHsl(data[i]!, data[i + 1]!, data[i + 2]!);
      if (s < 0.12 || l < 0.08 || l > 0.95) continue;
      samples.push({ hue: h, weight: s });
    }
    return samples.length ? paletteFromHues(samples) : DEFAULT_PALETTE;
  } catch {
    return DEFAULT_PALETTE;
  }
}
