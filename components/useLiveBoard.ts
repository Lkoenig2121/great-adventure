"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, clientSessionId } from "@/lib/api";
import type { LiveAttraction, Operator, ParkEvent } from "@/lib/theme-park";
import type { PresenceWatcher } from "@/components/PresenceRail";

export type ConnectionState = "connecting" | "live" | "degraded" | "offline";

type StreamItem = {
  type: string;
  payload: {
    attraction?: LiveAttraction;
    event?: ParkEvent;
  };
};

export function useLiveBoard(operator: Operator | null) {
  const [attractions, setAttractions] = useState<LiveAttraction[]>([]);
  const [events, setEvents] = useState<ParkEvent[]>([]);
  const [watchers, setWatchers] = useState<PresenceWatcher[]>([]);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [burstNotice, setBurstNotice] = useState<string | null>(null);
  const lastMessageAt = useRef(0);

  const applyItems = useCallback((items: StreamItem[]) => {
    for (const item of items) {
      if (item.type === "attraction.updated" && item.payload.attraction) {
        const next = item.payload.attraction;
        setAttractions((current) => {
          const index = current.findIndex((row) => row.id === next.id);
          if (index === -1) return [next, ...current];
          const copy = current.slice();
          copy[index] = { ...copy[index], ...next };
          return copy;
        });
      }
      if (item.type === "event.appended" && item.payload.event) {
        const next = item.payload.event;
        setEvents((current) => [next, ...current.filter((row) => row.id !== next.id)].slice(0, 120));
      }
    }
  }, []);

  const refreshWatchers = useCallback(async () => {
    try {
      const data = await api<{ watchers: PresenceWatcher[] }>("/api/watchers");
      setWatchers(data.watchers);
    } catch {
      /* guest walls get an empty list */
    }
  }, []);

  useEffect(() => {
    if (!operator) return;
    const source = new EventSource("/api/stream");

    const markLive = () => {
      lastMessageAt.current = Date.now();
      setConnection("live");
    };

    source.addEventListener("hello", () => markLive());
    source.addEventListener("heartbeat", () => markLive());
    source.addEventListener("snapshot", (message) => {
      markLive();
      const data = JSON.parse((message as MessageEvent).data) as {
        attractions: LiveAttraction[];
        events: ParkEvent[];
      };
      setAttractions(data.attractions);
      setEvents(data.events);
    });
    const onBatch = (message: MessageEvent, burst: boolean) => {
      markLive();
      const data = JSON.parse(message.data) as { count: number; items: StreamItem[] };
      applyItems(data.items);
      if (burst) {
        setBurstNotice(`High radio traffic — ${data.count} updates coalesced.`);
        window.setTimeout(() => setBurstNotice(null), 4000);
      }
    };
    source.addEventListener("batch", (message) => onBatch(message as MessageEvent, false));
    source.addEventListener("burst", (message) => onBatch(message as MessageEvent, true));
    source.onerror = () => {
      setConnection("offline");
    };

    return () => source.close();
  }, [operator, applyItems]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (lastMessageAt.current === 0) return;
      const age = Date.now() - lastMessageAt.current;
      if (age > 25000) setConnection("offline");
      else if (age > 14000) setConnection((current) => (current === "offline" ? current : "degraded"));
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!operator) return;
    const pulse = async () => {
      try {
        await api("/api/watchers/heartbeat", {
          method: "PUT",
          body: JSON.stringify({
            sessionId: clientSessionId(),
            siteCode: operator.siteCode,
          }),
        });
        await refreshWatchers();
      } catch {
        /* still show the board */
      }
    };
    void pulse();
    const timer = window.setInterval(() => void pulse(), 15000);
    return () => window.clearInterval(timer);
  }, [operator, refreshWatchers]);

  return { attractions, events, watchers, connection, burstNotice, setAttractions };
}
