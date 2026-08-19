"use client";

import type { FlashReservation } from "@/lib/theme-park";
import { FlashPassTimer } from "./FlashPassTimer";

function windowLabel(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function FlashPassPanel({
  reservations,
  busyId,
  onCancel,
}: {
  reservations: FlashReservation[];
  busyId: string | null;
  onCancel: (id: string) => Promise<void>;
}) {
  const active = reservations.filter((item) => item.status === "held" || item.status === "called");
  return (
    <section className="ga-glass rounded-3xl px-4 py-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-ga-blue">Your Flash Pass</h2>
      <p className="mt-1 text-xs text-ga-ink/55">Gold plan · up to 2 return times</p>
      <ul className="mt-3 space-y-3 text-sm text-ga-ink">
        {active.length === 0 ? (
          <li className="text-ga-ink/55">No spots reserved. Pick a ride on the wall.</li>
        ) : (
          active.map((item) => (
            <li key={item.id} className="rounded-2xl border border-ga-blue/15 bg-white/70 p-3">
              <p className="font-semibold text-ga-blue">
                {item.attractionName}{" "}
                <span className="font-mono text-xs text-ga-green">{item.attractionCode}</span>
              </p>
              <p className="text-xs text-ga-ink/70">
                Return {windowLabel(item.returnStartAt)}–{windowLabel(item.returnEndAt)} · party of {item.partySize}
              </p>
              <FlashPassTimer reservation={item} />
              <button
                type="button"
                disabled={busyId === item.id}
                className="mt-2 text-xs font-semibold text-ga-blue underline disabled:opacity-50"
                onClick={() => void onCancel(item.id)}
              >
                Release spot
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
