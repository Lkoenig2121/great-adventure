import type { FlashReservation, FlashReservationStatus } from "../lib/theme-park";
import { query } from "./db";

type ReservationRow = {
  id: string;
  attraction_id: string;
  attraction_name: string;
  attraction_code: string;
  holder_id: string;
  holder_name: string;
  status: FlashReservationStatus;
  party_size: number;
  return_start_at: Date;
  return_end_at: Date;
  created_at: Date;
};

const SELECT = `
  SELECT r.id, r.attraction_id, a.name AS attraction_name, a.code AS attraction_code,
         r.holder_id, o.display_name AS holder_name, r.status, r.party_size,
         r.return_start_at, r.return_end_at, r.created_at
  FROM line_reservations r
  JOIN attractions a ON a.id = r.attraction_id
  JOIN operators o ON o.id = r.holder_id
`;

export function mapReservation(row: ReservationRow): FlashReservation {
  return {
    id: row.id,
    attractionId: row.attraction_id,
    attractionName: row.attraction_name,
    attractionCode: row.attraction_code,
    holderId: row.holder_id,
    holderName: row.holder_name,
    status: row.status,
    partySize: row.party_size,
    returnStartAt: new Date(row.return_start_at).toISOString(),
    returnEndAt: new Date(row.return_end_at).toISOString(),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function listActiveReservations(holderId?: string): Promise<FlashReservation[]> {
  const params: unknown[] = [];
  let where = `WHERE r.status IN ('held', 'called')`;
  if (holderId) {
    params.push(holderId);
    where += ` AND r.holder_id = $${params.length}`;
  }
  const result = await query<ReservationRow>(
    `${SELECT} ${where} ORDER BY r.return_start_at ASC`,
    params,
  );
  return result.rows.map(mapReservation);
}

export async function flashQueueCounts(): Promise<Map<string, number>> {
  const result = await query<{ attraction_id: string; count: string }>(
    `SELECT attraction_id, COUNT(*)::text AS count
     FROM line_reservations
     WHERE status IN ('held', 'called')
     GROUP BY attraction_id`,
  );
  return new Map(result.rows.map((row) => [row.attraction_id, Number(row.count)]));
}

export async function getReservation(id: string) {
  const result = await query<ReservationRow>(`${SELECT} WHERE r.id = $1`, [id]);
  return result.rows[0] ? mapReservation(result.rows[0]) : null;
}

export async function countActiveForHolder(holderId: string): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM line_reservations
     WHERE holder_id = $1 AND status IN ('held', 'called')`,
    [holderId],
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function activeForAttraction(holderId: string, attractionId: string) {
  const result = await query<ReservationRow>(
    `${SELECT} WHERE r.holder_id = $1 AND r.attraction_id = $2 AND r.status IN ('held', 'called')`,
    [holderId, attractionId],
  );
  return result.rows[0] ? mapReservation(result.rows[0]) : null;
}

export async function expireDueReservations(): Promise<FlashReservation[]> {
  const due = await query<ReservationRow>(
    `${SELECT} WHERE r.status IN ('held', 'called') AND r.return_end_at < NOW()`,
  );
  const expired: FlashReservation[] = [];
  for (const row of due.rows) {
    await query(`UPDATE line_reservations SET status = 'expired' WHERE id = $1`, [row.id]);
    expired.push(mapReservation({ ...row, status: "expired" }));
  }
  return expired;
}
