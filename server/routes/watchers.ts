import { Router } from "express";
import { canSeeInternalLiveData, isSiteCode } from "../../lib/theme-park";
import { requireAuth, type AuthedRequest } from "../auth";
import { query } from "../db";

export const watchersRouter = Router();

watchersRouter.use(requireAuth);

watchersRouter.get("/", async (req: AuthedRequest, res) => {
  if (!canSeeInternalLiveData(req.operator!.role)) {
    res.json({ watchers: [] });
    return;
  }
  const result = await query<{
    id: string;
    operator_id: string;
    display_name: string;
    role: string;
    session_id: string;
    attraction_id: string | null;
    site_code: string | null;
    last_seen_at: Date;
  }>(
    `SELECT w.id, w.operator_id, o.display_name, o.role, w.session_id,
            w.attraction_id, w.site_code, w.last_seen_at
     FROM watchers w
     JOIN operators o ON o.id = w.operator_id
     WHERE w.last_seen_at > NOW() - INTERVAL '45 seconds'
     ORDER BY o.display_name`,
  );
  res.json({
    watchers: result.rows.map((row) => ({
      id: row.id,
      operatorId: row.operator_id,
      displayName: row.display_name,
      role: row.role,
      sessionId: row.session_id,
      attractionId: row.attraction_id,
      siteCode: row.site_code,
      lastSeenAt: row.last_seen_at,
    })),
  });
});

watchersRouter.put("/heartbeat", async (req: AuthedRequest, res) => {
  const operator = req.operator!;
  const sessionId = String(req.body?.sessionId ?? "");
  if (!sessionId) {
    res.status(400).json({ error: "sessionId required." });
    return;
  }
  const attractionId = req.body?.attractionId || null;
  const siteCode =
    typeof req.body?.siteCode === "string" && isSiteCode(req.body.siteCode)
      ? req.body.siteCode
      : operator.siteCode;
  await query(
    `INSERT INTO watchers (id, operator_id, session_id, attraction_id, site_code, last_seen_at)
     VALUES ($1,$2,$3,$4,$5, NOW())
     ON CONFLICT (operator_id, session_id)
     DO UPDATE SET attraction_id = EXCLUDED.attraction_id,
                   site_code = EXCLUDED.site_code,
                   last_seen_at = NOW()`,
    [crypto.randomUUID(), operator.id, sessionId, attractionId, siteCode],
  );
  res.json({ ok: true });
});
