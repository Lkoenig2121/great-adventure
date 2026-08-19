import { STATUS_LABELS } from "../lib/theme-park";
import { query } from "./db";
import { hub } from "./hub";
import { getAttractionRow, insertEvent, toLiveAttraction } from "./queries";
import { expireDueReservations } from "./reservations";

const staleAlerted = new Set<string>();

export async function sweepStalePositions() {
  const result = await query<{ id: string }>(`SELECT id FROM attractions`);
  for (const { id } of result.rows) {
    const row = await getAttractionRow(id);
    if (!row) continue;
    const live = toLiveAttraction(row, "supervisor");
    if (live.stale && !staleAlerted.has(id)) {
      staleAlerted.add(id);
      const event = await insertEvent({
        attractionId: id,
        type: "stale_position",
        message: `${live.name} position is stale — last report ${Math.floor(live.staleForSeconds / 60)}m ago`,
        payload: { staleForSeconds: live.staleForSeconds, status: live.status },
      });
      hub.publish("attraction.updated", { attraction: live });
      hub.publish("event.appended", { event });
      hub.publish("stale.alert", { attractionId: id, name: live.name });
    } else if (!live.stale && staleAlerted.has(id)) {
      staleAlerted.delete(id);
      const event = await insertEvent({
        attractionId: id,
        type: "stale_cleared",
        message: `${live.name} position recovered (${STATUS_LABELS[live.status]})`,
        payload: { status: live.status },
      });
      hub.publish("attraction.updated", { attraction: live });
      hub.publish("event.appended", { event });
    }
  }
}

export async function sweepWatchers() {
  await query(`DELETE FROM watchers WHERE last_seen_at < NOW() - INTERVAL '2 minutes'`);
}

export async function sweepFlashWindows() {
  const expired = await expireDueReservations();
  for (const reservation of expired) {
    const event = await insertEvent({
      attractionId: reservation.attractionId,
      type: "flash_expired",
      message: `Flash Pass window expired for ${reservation.attractionName} (${reservation.holderName})`,
      payload: { reservationId: reservation.id },
    });
    hub.publish("reservation.updated", { reservation });
    hub.publish("event.appended", { event });
  }
}
