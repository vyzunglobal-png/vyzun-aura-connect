/** Branded domains are never invented; links always work on the current origin. */
export function secretDropPath(username: string) {
  return `/ask/@${encodeURIComponent(username.replace(/^@/, "").toLowerCase())}`;
}

export function secretDropLink(origin: string, username: string) {
  return new URL(secretDropPath(username), origin).href;
}

export const SECRET_LIFETIME_MS = 24 * 60 * 60 * 1000;
export function secretExpiresAt(createdAt: number) {
  return createdAt + SECRET_LIFETIME_MS;
}