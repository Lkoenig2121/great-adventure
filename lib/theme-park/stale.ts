import { statusNeedsPositionChecks } from "./status";
import type { AttractionStatus } from "./types";

export const DEFAULT_STALE_AFTER_SECONDS = 180;

export function isParkOpen(now: Date, openHour = 9, closeHour = 22): boolean {
  const hour = now.getHours();
  return hour >= openHour && hour < closeHour;
}

export function secondsSince(capturedAt: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - capturedAt.getTime()) / 1000));
}

export function isStalePosition(input: {
  status: AttractionStatus;
  capturedAt: Date | null;
  staleAfterSeconds: number;
  now: Date;
  parkOpen?: boolean;
}): boolean {
  const parkOpen = input.parkOpen ?? isParkOpen(input.now);
  if (!parkOpen) return false;
  if (!statusNeedsPositionChecks(input.status)) return false;
  if (!input.capturedAt) return true;
  return secondsSince(input.capturedAt, input.now) > input.staleAfterSeconds;
}
