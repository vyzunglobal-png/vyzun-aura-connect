import { toPng } from "html-to-image";

/** Render a DOM node to a high-resolution PNG blob + data URL (2x by default; 3x gives 1080×1920 stories). */
export async function renderNodeToPng(node: HTMLElement, pixelRatio = 2) {
  const dataUrl = await toPng(node, {
    pixelRatio,
    cacheBust: true,
    // Remote font stylesheets can't be read cross-origin; skip to avoid noisy failures.
    skipFonts: true,
  });
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return { dataUrl, blob };
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Native share with the PNG attached; falls back to download. */
export async function shareImage(blob: Blob, dataUrl: string, text: string, filename = "vyzun-aura.png") {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text, title: "VYZUN Aura" });
      return "shared" as const;
    } catch {
      return "cancelled" as const;
    }
  }
  downloadDataUrl(dataUrl, filename);
  return "downloaded" as const;
}
