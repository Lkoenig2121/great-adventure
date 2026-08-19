import type {
  AttractionKind,
  AttractionStatus,
  EventType,
  LiveAttraction,
  Operator,
  OperatorRole,
  ParkEvent,
  SiteCode,
} from "../lib/theme-park";
import {
  canSeeInternalLiveData,
  isStalePosition,
  publicStatusForRole,
} from "../lib/theme-park";
import { flashQueueCounts, listActiveReservations } from "./reservations";
import { query } from "./db";

type AttractionRow = {
  id: string;
  code: string;
  name: string;
  kind: AttractionKind;
  site_code: SiteCode;
  unit_code: string;
  assigned_operator_id: string | null;
  assigned_operator_name: string | null;
  queue_capacity: number;
  stale_after_seconds: number;
  internal_notes: string | null;
  flash_pass_eligible: boolean;
  status: AttractionStatus | null;
  wait_minutes: number | null;
  trains_on_track: number | null;
  hold_reason: string | null;
  reported_by_id: string | null;
  reported_by_name: string | null;
  captured_at: Date | null;
};

type EventRow = {
  id: string;
  attraction_id: string | null;
  type: EventType;
  message: string;
  payload: Record<string, unknown>;
  actor_id: string | null;
  occurred_at: Date;
};

const ATTRACTION_SELECT = `
  SELECT
    a.id, a.code, a.name, a.kind, a.site_code, a.unit_code,
    a.assigned_operator_id, ao.display_name AS assigned_operator_name,
    a.queue_capacity, a.stale_after_seconds, a.internal_notes, a.flash_pass_eligible,
    s.status, s.wait_minutes, s.trains_on_track, s.hold_reason,
    s.reported_by_id, ro.display_name AS reported_by_name, s.captured_at
  FROM attractions a
  LEFT JOIN status_snapshots s ON s.attraction_id = a.id AND s.is_current
  LEFT JOIN operators ao ON ao.id = a.assigned_operator_id
  LEFT JOIN operators ro ON ro.id = s.reported_by_id
`;

export function toLiveAttraction(row: AttractionRow, role: OperatorRole, now = new Date()): LiveAttraction {
  const status = row.status ?? "closed";
  const capturedAt = row.captured_at ? new Date(row.captured_at) : null;
  const stale = isStalePosition({
    status,
    capturedAt,
    staleAfterSeconds: row.stale_after_seconds,
    now,
  });
  const internal = canSeeInternalLiveData(role);
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    kind: row.kind,
    siteCode: row.site_code,
    unitCode: row.unit_code,
    assignedOperatorId: row.assigned_operator_id,
    queueCapacity: row.queue_capacity,
    staleAfterSeconds: row.stale_after_seconds,
    internalNotes: internal ? row.internal_notes : null,
    status,
    publicStatus: publicStatusForRole(status, role),
    waitMinutes: row.wait_minutes,
    trainsOnTrack: internal ? row.trains_on_track : null,
    holdReason: internal ? row.hold_reason : null,
    reportedById: internal ? row.reported_by_id : null,
    reportedByName: internal ? row.reported_by_name : null,
    assignedOperatorName: internal ? row.assigned_operator_name : null,
    capturedAt: capturedAt?.toISOString() ?? null,
    stale: internal ? stale : false,
    staleForSeconds:
      internal && capturedAt ? Math.max(0, Math.floor((now.getTime() - capturedAt.getTime()) / 1000)) : 0,
    flashPassEligible: Boolean(row.flash_pass_eligible),
    flashQueueCount: 0,
    myReservation: null,
  };
}

export async function listAttractions(
  operator: Operator,
  filters: { site?: string; unit?: string; person?: string; status?: string },
): Promise<LiveAttraction[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.site) {
    params.push(filters.site);
    clauses.push(`a.site_code = $${params.length}`);
  }
  if (filters.unit) {
    params.push(filters.unit);
    clauses.push(`a.unit_code = $${params.length}`);
  }
  if (filters.person) {
    params.push(`%${filters.person}%`);
    const idx = params.length;
    clauses.push(
      `(ao.display_name ILIKE $${idx} OR ro.display_name ILIKE $${idx} OR a.assigned_operator_id::text = $${idx} OR s.reported_by_id::text = $${idx})`,
    );
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await query<AttractionRow>(`${ATTRACTION_SELECT} ${where} ORDER BY a.name`, params);
  const counts = await flashQueueCounts();
  const mine =
    operator.role === "flash_pass" ? await listActiveReservations(operator.id) : [];
  let rows = result.rows.map((row) => {
    const live = toLiveAttraction(row, operator.role);
    live.flashQueueCount = counts.get(live.id) ?? 0;
    live.myReservation = mine.find((item) => item.attractionId === live.id) ?? null;
    return live;
  });
  if (filters.status) {
    rows = rows.filter((row) => row.publicStatus === filters.status || row.status === filters.status);
  }
  return rows;
}

export async function getAttractionRow(id: string) {
  const result = await query<AttractionRow>(`${ATTRACTION_SELECT} WHERE a.id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function insertEvent(input: {
  attractionId?: string | null;
  type: EventType;
  message: string;
  payload?: Record<string, unknown>;
  actorId?: string | null;
}): Promise<ParkEvent> {
  const id = crypto.randomUUID();
  const result = await query<EventRow>(
    `INSERT INTO events (id, attraction_id, type, message, payload, actor_id)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)
     RETURNING *`,
    [
      id,
      input.attractionId ?? null,
      input.type,
      input.message,
      JSON.stringify(input.payload ?? {}),
      input.actorId ?? null,
    ],
  );
  return mapEvent(result.rows[0]);
}

export function mapEvent(row: EventRow): ParkEvent {
  return {
    id: row.id,
    attractionId: row.attraction_id,
    type: row.type,
    message: row.message,
    payload: row.payload ?? {},
    actorId: row.actor_id,
    occurredAt: new Date(row.occurred_at).toISOString(),
  };
}

export async function listEvents(limit = 80): Promise<ParkEvent[]> {
  const result = await query<EventRow>(
    `SELECT * FROM events ORDER BY occurred_at DESC LIMIT $1`,
    [Math.min(limit, 200)],
  );
  return result.rows.map(mapEvent);
}
