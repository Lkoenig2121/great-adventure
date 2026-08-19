import type { Response } from "express";
import type { LiveAttraction, OperatorRole, ParkEvent } from "../lib/theme-park";
import { redactEventForRole, redactLiveAttraction } from "../lib/theme-park";

export type HubMessage = {
  id: number;
  type: string;
  at: string;
  payload: unknown;
};

type Client = {
  id: string;
  res: Response;
  role: OperatorRole;
};

const BURST_WINDOW_MS = 80;
const BURST_FLUSH_SIZE = 24;

class EventHub {
  private clients = new Map<string, Client>();
  private sequence = 0;
  private queue: HubMessage[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  subscribe(id: string, res: Response, role: OperatorRole) {
    this.clients.set(id, { id, res, role });
  }

  unsubscribe(id: string) {
    this.clients.delete(id);
  }

  clientCount() {
    return this.clients.size;
  }

  publish(type: string, payload: unknown) {
    this.sequence += 1;
    this.queue.push({
      id: this.sequence,
      type,
      at: new Date().toISOString(),
      payload,
    });
    if (this.queue.length >= BURST_FLUSH_SIZE) {
      this.flush();
      return;
    }
    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), BURST_WINDOW_MS);
    }
  }

  private flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.queue.length === 0) return;
    const batch = this.queue;
    this.queue = [];
    const burst = batch.length > 5;
    for (const client of this.clients.values()) {
      const items = batch.map((message) => this.forRole(message, client.role));
      this.write(client.res, {
        id: items[items.length - 1]?.id,
        event: burst ? "burst" : "batch",
        data: { burst, count: items.length, items },
      });
    }
  }

  heartbeat() {
    for (const client of this.clients.values()) {
      this.write(client.res, {
        event: "heartbeat",
        data: { at: new Date().toISOString(), watchers: this.clients.size },
      });
    }
  }

  write(
    res: Response,
    message: { id?: number; event: string; data: unknown },
  ) {
    if (message.id) {
      res.write(`id: ${message.id}\n`);
    }
    res.write(`event: ${message.event}\n`);
    res.write(`data: ${JSON.stringify(message.data)}\n\n`);
  }

  private forRole(message: HubMessage, role: OperatorRole): HubMessage {
    if (!message.payload || typeof message.payload !== "object") return message;
    const payload = { ...(message.payload as Record<string, unknown>) };
    if (payload.event) {
      payload.event = redactEventForRole(payload.event as ParkEvent, role);
    }
    if (payload.attraction) {
      payload.attraction = redactLiveAttraction(
        payload.attraction as LiveAttraction,
        role,
      );
    }
    return { ...message, payload };
  }
}

export const hub = new EventHub();
