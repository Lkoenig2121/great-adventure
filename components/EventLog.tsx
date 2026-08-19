"use client";

import type { ParkEvent } from "@/lib/theme-park";

export function EventLog({ events }: { events: ParkEvent[] }) {
  return (
    <section className="ga-glass flex h-full min-h-[22rem] flex-col rounded-3xl">
      <header className="border-b border-ga-blue/15 px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-ga-blue">Event log</h2>
        <p className="text-xs text-ga-ink/55">Radio traffic as units move</p>
      </header>
      <ol className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
        {events.length === 0 ? (
          <li className="text-ga-ink/55">No traffic yet.</li>
        ) : (
          events.map((event) => (
            <li key={event.id} className="border-l-2 border-ga-green pl-3">
              <p className="text-[11px] uppercase tracking-wide text-ga-blue/70">
                {event.type.replace("_", " ")} · {new Date(event.occurredAt).toLocaleTimeString()}
              </p>
              <p className="text-ga-ink">{event.message}</p>
            </li>
          ))
        )}
      </ol>
    </section>
  );
}
