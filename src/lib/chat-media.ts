export const CHAT_PREVIEW_LIMIT = 20 * 1024 * 1024;
export function validChatPreview(file: { type: string; size: number }) {
  return /^(image|video|audio)\//.test(file.type) && file.size > 0 && file.size <= CHAT_PREVIEW_LIMIT;
}