import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import { migrate } from "./migrate";
import { seedIfEmpty, ensureFlashPassHolder } from "./seed";
import { hub } from "./hub";
import { sweepStalePositions, sweepWatchers, sweepFlashWindows } from "./sweep";
import { authRouter } from "./routes/auth";
import { attractionsRouter } from "./routes/attractions";
import { eventsRouter } from "./routes/events";
import { watchersRouter } from "./routes/watchers";
import { reservationsRouter } from "./routes/reservations";
import { streamRouter } from "./routes/stream";

const app = express();
const port = Number(process.env.API_PORT ?? 4000);
const origin = process.env.APP_ORIGIN ?? "http://localhost:3000";

app.use(
  cors({
    origin,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "256kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "great-adventure-ops", clients: hub.clientCount() });
});

app.use("/api/auth", authRouter);
app.use("/api/attractions", attractionsRouter);
app.use("/api/events", eventsRouter);
app.use("/api/watchers", watchersRouter);
app.use("/api/reservations", reservationsRouter);
app.use("/api/stream", streamRouter);

async function start() {
  try {
    await migrate();
    await seedIfEmpty();
    await ensureFlashPassHolder();
  } catch (error) {
    console.error("PostgreSQL is required. Start it, then retry.");
    console.error(error);
    process.exit(1);
  }

  setInterval(() => {
    hub.heartbeat();
  }, 10_000);
  setInterval(() => {
    void sweepStalePositions();
  }, 15_000);
  setInterval(() => {
    void sweepWatchers();
  }, 20_000);
  setInterval(() => {
    void sweepFlashWindows();
  }, 20_000);

  app.listen(port, () => {
    console.log(`Great Adventure ops API on http://localhost:${port}`);
  });
}

void start();
