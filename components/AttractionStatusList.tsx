"use client";

import { STATUS_RANK, type LiveAttraction, type Operator } from "@/lib/theme-park";
import { AttractionCard } from "./AttractionCard";

export function AttractionStatusList({
  attractions,
  operator,
  busyId,
  onReport,
  onReserve,
  onCancelReservation,
}: {
  attractions: LiveAttraction[];
  operator: Operator;
  busyId: string | null;
  onReport: (id: string, body: Record<string, unknown>) => Promise<void>;
  onReserve: (id: string) => Promise<void>;
  onCancelReservation: (reservationId: string) => Promise<void>;
}) {
  const sorted = [...attractions].sort((a, b) => {
    if (a.stale !== b.stale) return a.stale ? -1 : 1;
    return STATUS_RANK[a.publicStatus] - STATUS_RANK[b.publicStatus] || a.name.localeCompare(b.name);
  });

  if (sorted.length === 0) {
    return (
      <p className="ga-glass rounded-2xl px-4 py-10 text-center text-ga-ink/70">
        No attractions match this site / unit / person filter.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sorted.map((attraction) => (
        <AttractionCard
          key={`${attraction.id}-${attraction.capturedAt ?? "none"}-${attraction.status}`}
          attraction={attraction}
          operator={operator}
          busy={busyId === attraction.id}
          onReport={onReport}
          onReserve={onReserve}
          onCancelReservation={onCancelReservation}
        />
      ))}
    </div>
  );
}
