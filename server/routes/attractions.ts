import { Router } from "express";
import {
  canCreateAttraction,
  canReportPosition,
  canUpdateAttractionMeta,
  isAttractionStatus,
  isSiteCode,
  redactLiveAttraction,
  STATUS_LABELS,
} from "../../lib/theme-park";
import { requireAuth, type AuthedRequest } from "../auth";
import { query } from "../db";
import { hub } from "../hub";
import {
  getAttractionRow,
  insertEvent,
  listAttractions,
  toLiveAttraction,
} from "../queries";

export const attractionsRouter = Router();

attractionsRouter.use(requireAuth);

attractionsRouter.get("/", async (req: AuthedRequest, res) => {
  const operator = req.operator!;
  const attractions = await listAttractions(operator, {
    site: String(req.query.site ?? "") || undefined,
    unit: String(req.query.unit ?? "") || undefined,
    person: String(req.query.person ?? "") || undefined,
    status: String(req.query.status ?? "") || undefined,
  });
  res.json({ attractions });
});

attractionsRouter.post("/", async (req: AuthedRequest, res) => {
  const operator = req.operator!;
  if (!canCreateAttraction(operator.role)) {
    res.status(403).json({ error: "Only park lead can add attractions." });
    return;
  }
  const code = String(req.body?.code ?? "").trim().toUpperCase();
  const name = String(req.body?.name ?? "").trim();
  const kind = String(req.body?.kind ?? "flat");
  const siteCode = String(req.body?.siteCode ?? "");
  const unitCode = String(req.body?.unitCode ?? "").trim().toUpperCase();
  if (!code || !name || !isSiteCode(siteCode) || !unitCode) {
    res.status(400).json({ error: "code, name, siteCode, and unitCode are required." });
    return;
  }
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO attractions (
      id, code, name, kind, site_code, unit_code, queue_capacity, stale_after_seconds, internal_notes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      id,
      code,
      name,
      kind,
      siteCode,
      unitCode,
      Number(req.body?.queueCapacity ?? 0),
      Number(req.body?.staleAfterSeconds ?? 180),
      req.body?.internalNotes ?? null,
    ],
  );
  await query(
    `INSERT INTO status_snapshots (id, attraction_id, status, wait_minutes, reported_by_id, is_current)
     VALUES ($1,$2,'closed',0,$3, TRUE)`,
    [crypto.randomUUID(), id, operator.id],
  );
  const event = await insertEvent({
    attractionId: id,
    type: "attraction_created",
    message: `${operator.displayName} added ${name} (${code})`,
    actorId: operator.id,
    payload: { code, siteCode },
  });
  const row = await getAttractionRow(id);
  const live = row ? toLiveAttraction(row, "supervisor") : null;
  hub.publish("attraction.updated", { attraction: live });
  hub.publish("event.appended", { event });
  res.status(201).json({ attraction: live ? redactLiveAttraction(live, operator.role) : null });
});

attractionsRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const operator = req.operator!;
  if (!canUpdateAttractionMeta(operator.role)) {
    res.status(403).json({ error: "Only park lead can edit attraction records." });
    return;
  }
  const current = await getAttractionRow(String(req.params.id));
  if (!current) {
    res.status(404).json({ error: "Attraction not on today's inventory." });
    return;
  }
  const name = String(req.body?.name ?? current.name);
  const unitCode = String(req.body?.unitCode ?? current.unit_code);
  const staleAfterSeconds = Number(req.body?.staleAfterSeconds ?? current.stale_after_seconds);
  const internalNotes =
    req.body?.internalNotes === undefined ? current.internal_notes : req.body.internalNotes;
  const assignedOperatorId =
    req.body?.assignedOperatorId === undefined
      ? current.assigned_operator_id
      : req.body.assignedOperatorId;
  await query(
    `UPDATE attractions
     SET name = $2, unit_code = $3, stale_after_seconds = $4, internal_notes = $5,
         assigned_operator_id = $6, updated_at = NOW()
     WHERE id = $1`,
    [String(req.params.id), name, unitCode, staleAfterSeconds, internalNotes, assignedOperatorId],
  );
  const event = await insertEvent({
    attractionId: String(req.params.id),
    type: "attraction_updated",
    message: `${operator.displayName} updated ${name}`,
    actorId: operator.id,
  });
  const row = await getAttractionRow(String(req.params.id));
  const live = row ? toLiveAttraction(row, "supervisor") : null;
  hub.publish("attraction.updated", { attraction: live });
  hub.publish("event.appended", { event });
  res.json({ attraction: live ? redactLiveAttraction(live, operator.role) : null });
});

attractionsRouter.post("/:id/status", async (req: AuthedRequest, res) => {
  const operator = req.operator!;
  const row = await getAttractionRow(String(req.params.id));
  if (!row) {
    res.status(404).json({ error: "Attraction not on today's inventory." });
    return;
  }
  const attraction = toLiveAttraction(row, "supervisor");
  if (!canReportPosition(operator, attraction)) {
    res.status(403).json({ error: "You are not assigned to this site or unit." });
    return;
  }
  const status = String(req.body?.status ?? "");
  if (!isAttractionStatus(status)) {
    res.status(400).json({ error: "Unknown ride status." });
    return;
  }
  const waitMinutes =
    req.body?.waitMinutes === undefined || req.body.waitMinutes === ""
      ? attraction.waitMinutes
      : Number(req.body.waitMinutes);
  const trainsOnTrack =
    req.body?.trainsOnTrack === undefined || req.body.trainsOnTrack === ""
      ? attraction.trainsOnTrack
      : Number(req.body.trainsOnTrack);
  const holdReason =
    req.body?.holdReason === undefined ? attraction.holdReason : String(req.body.holdReason || "") || null;

  const unchanged =
    status === attraction.status &&
    waitMinutes === attraction.waitMinutes &&
    trainsOnTrack === attraction.trainsOnTrack &&
    holdReason === attraction.holdReason;
  const type = unchanged ? "position_check" : "status_change";
  const message = unchanged
    ? `${operator.displayName} checked ${attraction.name} still ${STATUS_LABELS[status]}`
    : `${operator.displayName} moved ${attraction.name} ${STATUS_LABELS[attraction.status]} → ${STATUS_LABELS[status]}`;

  await query(`UPDATE status_snapshots SET is_current = FALSE WHERE attraction_id = $1 AND is_current`, [
    attraction.id,
  ]);
  await query(
    `INSERT INTO status_snapshots (
      id, attraction_id, status, wait_minutes, trains_on_track, hold_reason, reported_by_id, is_current
    ) VALUES ($1,$2,$3,$4,$5,$6,$7, TRUE)`,
    [crypto.randomUUID(), attraction.id, status, waitMinutes, trainsOnTrack, holdReason, operator.id],
  );
  const event = await insertEvent({
    attractionId: attraction.id,
    type,
    message,
    actorId: operator.id,
    payload: {
      previousStatus: attraction.status,
      nextStatus: status,
      waitMinutes,
    },
  });
  const nextRow = await getAttractionRow(attraction.id);
  const live = nextRow ? toLiveAttraction(nextRow, "supervisor") : attraction;
  hub.publish("attraction.updated", { attraction: live });
  hub.publish("event.appended", { event });
  res.json({
    attraction: redactLiveAttraction(live, operator.role),
    event,
  });
});
