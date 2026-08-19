import { Router } from "express";
import {
  canHoldFlashPass,
  flashReturnWindow,
  kindAcceptsFlashPass,
  MAX_ACTIVE_FLASH_PASSES,
  rideAcceptsNewFlashPass,
} from "../../lib/theme-park";
import { requireAuth, type AuthedRequest } from "../auth";
import { query } from "../db";
import { hub } from "../hub";
import { getAttractionRow, insertEvent, toLiveAttraction } from "../queries";
import {
  activeForAttraction,
  countActiveForHolder,
  flashQueueCounts,
  getReservation,
  listActiveReservations,
} from "../reservations";

export const reservationsRouter = Router();
reservationsRouter.use(requireAuth);

async function liveWithQueue(attractionId: string) {
  const row = await getAttractionRow(attractionId);
  if (!row) return null;
  const live = toLiveAttraction(row, "supervisor");
  const counts = await flashQueueCounts();
  live.flashQueueCount = counts.get(attractionId) ?? 0;
  return live;
}

reservationsRouter.get("/", async (req: AuthedRequest, res) => {
  const operator = req.operator!;
  const holderId = operator.role === "flash_pass" ? operator.id : undefined;
  const reservations = await listActiveReservations(holderId);
  res.json({ reservations });
});

reservationsRouter.post("/", async (req: AuthedRequest, res) => {
  const operator = req.operator!;
  if (!canHoldFlashPass(operator.role)) {
    res.status(403).json({ error: "Only Flash Pass holders can reserve a return time." });
    return;
  }
  const attractionId = String(req.body?.attractionId ?? "");
  const partySize = Math.min(8, Math.max(1, Number(req.body?.partySize ?? 1)));
  const row = await getAttractionRow(attractionId);
  if (!row) {
    res.status(404).json({ error: "Attraction not on today's inventory." });
    return;
  }
  if (!row.flash_pass_eligible || !kindAcceptsFlashPass(row.kind)) {
    res.status(400).json({ error: "This attraction is not on Flash Pass today." });
    return;
  }
  const status = row.status ?? "closed";
  if (!rideAcceptsNewFlashPass(status)) {
    res.status(409).json({ error: "Flash Pass is paused while this ride is not cycling." });
    return;
  }
  if (await activeForAttraction(operator.id, attractionId)) {
    res.status(409).json({ error: "You already have a return time for this ride." });
    return;
  }
  if ((await countActiveForHolder(operator.id)) >= MAX_ACTIVE_FLASH_PASSES) {
    res.status(409).json({
      error: `Gold Flash Pass allows ${MAX_ACTIVE_FLASH_PASSES} active return times at once.`,
    });
    return;
  }

  const window = flashReturnWindow(row.wait_minutes);
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO line_reservations (
      id, attraction_id, holder_id, status, party_size, return_start_at, return_end_at
    ) VALUES ($1,$2,$3,'held',$4,$5,$6)`,
    [id, attractionId, operator.id, partySize, window.start, window.end],
  );
  const reservation = await getReservation(id);
  const event = await insertEvent({
    attractionId,
    type: "flash_reserved",
    message: `${operator.displayName} reserved Flash Pass for ${row.name} (${window.virtualWait} min return)`,
    actorId: operator.id,
    payload: { reservationId: id, virtualWait: window.virtualWait },
  });
  const attraction = await liveWithQueue(attractionId);
  hub.publish("attraction.updated", { attraction });
  hub.publish("reservation.updated", { reservation });
  hub.publish("event.appended", { event });
  res.status(201).json({ reservation, attraction });
});

reservationsRouter.post("/:id/cancel", async (req: AuthedRequest, res) => {
  const operator = req.operator!;
  const reservation = await getReservation(String(req.params.id));
  if (!reservation) {
    res.status(404).json({ error: "No Flash Pass reservation with that id." });
    return;
  }
  const canCancel =
    reservation.holderId === operator.id ||
    operator.role === "supervisor" ||
    operator.role === "ride_ops";
  if (!canCancel) {
    res.status(403).json({ error: "You cannot release this return time." });
    return;
  }
  if (reservation.status !== "held" && reservation.status !== "called") {
    res.status(409).json({ error: "That return time is no longer active." });
    return;
  }
  await query(`UPDATE line_reservations SET status = 'cancelled' WHERE id = $1`, [reservation.id]);
  const next = { ...reservation, status: "cancelled" as const };
  const event = await insertEvent({
    attractionId: reservation.attractionId,
    type: "flash_cancelled",
    message: `${operator.displayName} released Flash Pass for ${reservation.attractionName}`,
    actorId: operator.id,
    payload: { reservationId: reservation.id },
  });
  const attraction = await liveWithQueue(reservation.attractionId);
  hub.publish("attraction.updated", { attraction });
  hub.publish("reservation.updated", { reservation: next });
  hub.publish("event.appended", { event });
  res.json({ reservation: next, attraction });
});
