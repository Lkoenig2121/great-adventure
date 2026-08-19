import { Router } from "express";
import { redactEventForRole } from "../../lib/theme-park";
import { requireAuth, type AuthedRequest } from "../auth";
import { listEvents } from "../queries";

export const eventsRouter = Router();

eventsRouter.use(requireAuth);

eventsRouter.get("/", async (req: AuthedRequest, res) => {
  const operator = req.operator!;
  const events = await listEvents(Number(req.query.limit ?? 80));
  res.json({
    events: events.map((event) => redactEventForRole(event, operator.role)),
  });
});
