export const OPERATOR_ROLES = [
  "guest_wall",
  "ride_ops",
  "supervisor",
  "flash_pass",
] as const;

export type OperatorRole = (typeof OPERATOR_ROLES)[number];

export const ATTRACTION_STATUSES = [
  "open",
  "cycling",
  "delayed",
  "weather_hold",
  "down",
  "evac",
  "closed",
] as const;

export type AttractionStatus = (typeof ATTRACTION_STATUSES)[number];

export const ATTRACTION_KINDS = [
  "coaster",
  "water",
  "flat",
  "family",
  "show",
  "dining",
  "service",
  "transport",
] as const;

export type AttractionKind = (typeof ATTRACTION_KINDS)[number];

export const EVENT_TYPES = [
  "status_change",
  "position_check",
  "stale_position",
  "stale_cleared",
  "presence",
  "attraction_created",
  "attraction_updated",
  "flash_reserved",
  "flash_cancelled",
  "flash_expired",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export type SiteCode =
  | "liberty-court"
  | "best-of-the-west"
  | "kiddie-kingdom"
  | "goodtime-alley"
  | "neptunes-kingdom"
  | "enchanted-forest";

export type Operator = {
  id: string;
  username: string;
  displayName: string;
  role: OperatorRole;
  siteCode: SiteCode | null;
  unitCode: string | null;
};

export type Attraction = {
  id: string;
  code: string;
  name: string;
  kind: AttractionKind;
  siteCode: SiteCode;
  unitCode: string;
  assignedOperatorId: string | null;
  queueCapacity: number;
  staleAfterSeconds: number;
  internalNotes: string | null;
};

export type StatusSnapshot = {
  id: string;
  attractionId: string;
  status: AttractionStatus;
  waitMinutes: number | null;
  trainsOnTrack: number | null;
  holdReason: string | null;
  reportedById: string | null;
  capturedAt: string;
};

export type ParkEvent = {
  id: string;
  attractionId: string | null;
  type: EventType;
  message: string;
  payload: Record<string, unknown>;
  actorId: string | null;
  occurredAt: string;
};

export type Watcher = {
  id: string;
  operatorId: string;
  sessionId: string;
  attractionId: string | null;
  siteCode: SiteCode | null;
  lastSeenAt: string;
};

export const FLASH_RESERVATION_STATUSES = [
  "held",
  "called",
  "cancelled",
  "expired",
  "redeemed",
] as const;

export type FlashReservationStatus = (typeof FLASH_RESERVATION_STATUSES)[number];

export type FlashReservation = {
  id: string;
  attractionId: string;
  attractionName: string;
  attractionCode: string;
  holderId: string;
  holderName: string;
  status: FlashReservationStatus;
  partySize: number;
  returnStartAt: string;
  returnEndAt: string;
  createdAt: string;
};

export type LiveAttraction = Attraction & {
  status: AttractionStatus;
  publicStatus: AttractionStatus;
  waitMinutes: number | null;
  trainsOnTrack: number | null;
  holdReason: string | null;
  reportedById: string | null;
  reportedByName: string | null;
  assignedOperatorName: string | null;
  capturedAt: string | null;
  stale: boolean;
  staleForSeconds: number;
  flashPassEligible: boolean;
  flashQueueCount: number;
  myReservation: FlashReservation | null;
};
