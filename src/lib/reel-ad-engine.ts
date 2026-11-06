export function withSponsoredSlots<T>(reels: T[], interval = 4): ({ kind: "reel"; reel: T } | { kind: "ad"; slot: number })[] {
  const cadence = Math.max(4, Math.min(5, Math.floor(interval)));
  return reels.flatMap((reel, index) => {
    const item = { kind: "reel" as const, reel };
    return (index + 1) % cadence === 0 ? [item, { kind: "ad" as const, slot: (index + 1) / cadence }] : [item];
  });
}