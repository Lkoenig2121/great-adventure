import type { AttractionKind, AttractionStatus, OperatorRole } from "./types";

export const MAX_ACTIVE_FLASH_PASSES = 2;

const FLASH_ELIGIBLE_KINDS: AttractionKind[] = [
  "coaster",
  "water",
  "flat",
  "family",
  "transport",
];

export function kindAcceptsFlashPass(kind: AttractionKind): boolean {
  return FLASH_ELIGIBLE_KINDS.includes(kind);
}

export function canHoldFlashPass(role: OperatorRole): boolean {
  return role === "flash_pass";
}

export function canSeeFlashPassQueue(role: OperatorRole): boolean {
  return role === "ride_ops" || role === "supervisor" || role === "flash_pass";
}

export function rideAcceptsNewFlashPass(status: AttractionStatus): boolean {
  return status === "open" || status === "cycling" || status === "delayed";
}

export function flashReturnWindow(waitMinutes: number | null, now = new Date()) {
  const virtualWait = Math.max(5, Math.round((waitMinutes ?? 15) * 0.4));
  const start = new Date(now.getTime() + virtualWait * 60_000);
  const end = new Date(start.getTime() + 15 * 60_000);
  return { virtualWait, start, end };
}
