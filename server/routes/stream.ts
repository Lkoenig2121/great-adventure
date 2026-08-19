import { Router } from "express";
import { redactEventForRole } from "../../lib/theme-park";
import { cookieName, operatorFromToken } from "../auth";
import { hub } from "../hub";
import { listAttractions, listEvents } from "../queries";

export const streamRouter = Router();

streamRouter.get("/", async (req, res) => {
  const token =
    (req.cookies?.[cookieName()] as string | undefined) ??
    (typeof req.query.token === "string" ? req.query.token : undefined);
  const operator = await operatorFromToken(token);
  if (!operator) {
    res.status(401).json({ error: "Sign in to see live park status." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const clientId = crypto.randomUUID();
  hub.subscribe(clientId, res, operator.role);
  hub.write(res, {
    event: "hello",
    data: {
      operator,
      at: new Date().toISOString(),
    },
  });

  const [attractions, events] = await Promise.all([
    listAttractions(operator, {}),
    listEvents(60),
  ]);
  hub.write(res, {
    event: "snapshot",
    data: {
      attractions,
      events: events.map((event) => redactEventForRole(event, operator.role)),
    },
  });

  req.on("close", () => {
    hub.unsubscribe(clientId);
  });
});
