const KEY = "vyzun.chunk-recovery";
const RETRY_WINDOW_MS = 60_000;

export function isChunkLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk .* failed/i.test(message);
}

/** One document refresh obtains the current deployment manifest, never a reload loop. */
export function recoverChunkLoad(error: unknown, storage: Pick<Storage, "getItem" | "setItem">, reload: () => void, now = Date.now()) {
  if (!isChunkLoadError(error)) return false;
  try {
    const previous = Number(storage.getItem(KEY));
    if (previous > 0 && now - previous < RETRY_WINDOW_MS) return false;
    storage.setItem(KEY, String(now));
  } catch { return false; }
  reload();
  return true;
}

let installed = false;
export function installChunkRecovery() {
  if (typeof window === "undefined" || installed) return;
  installed = true;
  window.addEventListener("vite:preloadError", event => {
    const preload = event as Event & { payload?: unknown };
    if (recoverChunkLoad(preload.payload, window.sessionStorage, () => window.location.reload())) event.preventDefault();
  });
}