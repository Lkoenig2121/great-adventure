"use client";

import type { LiveAttraction } from "@/lib/theme-park";
import { siteByCode } from "@/lib/theme-park";

export function StaleAlerts({ attractions }: { attractions: LiveAttraction[] }) {
  const stale = attractions.filter((item) => item.stale);
  if (stale.length === 0) return null;
  return (
    <section className="rounded-2xl border border-ga-blue/40 bg-white/80 px-4 py-3 text-ga-blue shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em]">Stale positions</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {stale.map((item) => (
          <li key={item.id}>
            <span className="font-semibold">{item.name}</span>{" "}
            <span className="text-ga-ink/70">
              {siteByCode(item.siteCode)?.name} · unit {item.unitCode} · last report{" "}
              {Math.max(1, Math.floor(item.staleForSeconds / 60))}m ago
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
