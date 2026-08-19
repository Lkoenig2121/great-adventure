import type { AttractionStatus } from "./types";
import { ATTRACTION_STATUSES } from "./types";

export const STATUS_LABELS: Record<AttractionStatus, string> = {
  open: "Open",
  cycling: "Cycling",
  delayed: "Delayed",
  weather_hold: "Weather hold",
  down: "Down",
  evac: "Evac",
  closed: "Closed",
};

export const STATUS_RANK: Record<AttractionStatus, number> = {
  evac: 0,
  down: 1,
  weather_hold: 2,
  delayed: 3,
  cycling: 4,
  open: 5,
  closed: 6,
};

export function isAttractionStatus(value: string): value is AttractionStatus {
  return (ATTRACTION_STATUSES as readonly string[]).includes(value);
}

export function statusNeedsPositionChecks(status: AttractionStatus): boolean {
  return status !== "closed";
}
