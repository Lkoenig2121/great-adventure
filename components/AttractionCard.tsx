"use client";

import { ATTRACTION_STATUSES, STATUS_LABELS, canHoldFlashPass, canReportPosition, rideAcceptsNewFlashPass, siteByCode, type AttractionStatus, type LiveAttraction, type Operator } from "@/lib/theme-park";
import { FlashPassTimer } from "./FlashPassTimer";

const TONE: Record<AttractionStatus, string> = {
  open: "border-ga-green/45 shadow-[0_0_28px_color-mix(in_oklab,var(--ga-green)_18%,transparent)]",
  cycling: "border-ga-blue/40 shadow-[0_0_28px_color-mix(in_oklab,var(--ga-blue)_16%,transparent)]",
  delayed: "border-ga-blue/55",
  weather_hold: "border-ga-blue/70 bg-[color-mix(in_oklab,var(--ga-blue)_8%,white)]",
  down: "border-ga-blue bg-[color-mix(in_oklab,var(--ga-blue)_12%,white)]",
  evac: "border-ga-blue bg-ga-blue text-white",
  closed: "border-ga-ink/15",
};

const CHIP: Record<AttractionStatus, string> = {
  open: "bg-ga-green text-white",
  cycling: "bg-ga-blue text-white",
  delayed: "bg-white text-ga-blue ring-1 ring-ga-blue/30",
  weather_hold: "bg-ga-blue/15 text-ga-blue",
  down: "bg-ga-blue text-white",
  evac: "bg-white text-ga-blue",
  closed: "bg-ga-sand text-ga-ink/70",
};

export function AttractionCard({
  attraction,
  operator,
  busy,
  onReport,
  onReserve,
  onCancelReservation,
}: {
  attraction: LiveAttraction;
  operator: Operator;
  busy: boolean;
  onReport: (id: string, body: Record<string, unknown>) => Promise<void>;
  onReserve: (id: string) => Promise<void>;
  onCancelReservation: (reservationId: string) => Promise<void>;
}) {
  const canEdit = canReportPosition(operator, attraction);
  const holder = canHoldFlashPass(operator.role);
  const shown = attraction.publicStatus;
  const inverted = shown === "evac";
  const canReserve =
    holder &&
    attraction.flashPassEligible &&
    !attraction.myReservation &&
    rideAcceptsNewFlashPass(attraction.status);

  return (
    <article
      className={`ga-glass rounded-3xl p-4 ${TONE[shown]} ${attraction.stale ? "ring-2 ring-ga-blue" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`font-mono text-xs ${inverted ? "text-white/70" : "text-ga-green"}`}>{attraction.code}</p>
          <h3 className={`font-[family-name:var(--font-display)] text-xl ${inverted ? "text-white" : "text-ga-blue"}`}>
            {attraction.name}
          </h3>
          <p className={`text-xs ${inverted ? "text-white/70" : "text-ga-ink/65"}`}>
            {siteByCode(attraction.siteCode)?.name} · {attraction.unitCode}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${CHIP[shown]}`}>
          {STATUS_LABELS[shown]}
        </span>
      </div>
      <dl className={`mt-3 grid grid-cols-2 gap-2 text-sm ${inverted ? "text-white" : "text-ga-ink"}`}>
        <div>
          <dt className={`text-[11px] uppercase tracking-wide ${inverted ? "text-white/60" : "text-ga-blue/70"}`}>Wait</dt>
          <dd>{attraction.waitMinutes == null ? "—" : `${attraction.waitMinutes} min`}</dd>
        </div>
        <div>
          <dt className={`text-[11px] uppercase tracking-wide ${inverted ? "text-white/60" : "text-ga-blue/70"}`}>
            Flash Pass
          </dt>
          <dd>
            {attraction.flashPassEligible
              ? `${attraction.flashQueueCount} in virtual line`
              : "Not on Flash Pass"}
          </dd>
        </div>
        {canEdit ? (
          <div>
            <dt className={`text-[11px] uppercase tracking-wide ${inverted ? "text-white/60" : "text-ga-blue/70"}`}>
              Trains / boats
            </dt>
            <dd>{attraction.trainsOnTrack ?? "—"}</dd>
          </div>
        ) : null}
        {canEdit ? (
          <div className="col-span-2">
            <dt className={`text-[11px] uppercase tracking-wide ${inverted ? "text-white/60" : "text-ga-blue/70"}`}>
              Last check-in
            </dt>
            <dd>
              {attraction.reportedByName ?? "Unknown"}{" "}
              {attraction.capturedAt ? `· ${new Date(attraction.capturedAt).toLocaleTimeString()}` : ""}
            </dd>
          </div>
        ) : null}
        {attraction.holdReason ? (
          <div className="col-span-2">
            <dt className={`text-[11px] uppercase tracking-wide ${inverted ? "text-white/60" : "text-ga-blue/70"}`}>
              Hold reason
            </dt>
            <dd>{attraction.holdReason}</dd>
          </div>
        ) : null}
      </dl>
      {attraction.myReservation ? (
        <div className="mt-3 border-t border-ga-blue/15 pt-3 text-sm">
          <p className="font-semibold text-ga-green">Spot reserved</p>
          <p className="text-xs text-ga-ink/70">
            Return {new Date(attraction.myReservation.returnStartAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            –
            {new Date(attraction.myReservation.returnEndAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </p>
          <FlashPassTimer reservation={attraction.myReservation} />
          <button
            type="button"
            disabled={busy}
            className="mt-2 text-xs font-semibold text-ga-blue underline disabled:opacity-50"
            onClick={() => void onCancelReservation(attraction.myReservation!.id)}
          >
            Release this return time
          </button>
        </div>
      ) : canReserve ? (
        <button
          type="button"
          disabled={busy}
          className="ga-btn mt-3 w-full rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50"
          onClick={() => void onReserve(attraction.id)}
        >
          {busy ? "Reserving…" : "Reserve Flash Pass spot"}
        </button>
      ) : null}
      {canEdit ? (
        <form
          className={`mt-3 grid gap-2 border-t pt-3 ${inverted ? "border-white/20" : "border-ga-blue/15"}`}
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            void onReport(attraction.id, {
              status: data.get("status"),
              waitMinutes: data.get("waitMinutes"),
              trainsOnTrack: data.get("trainsOnTrack") || undefined,
              holdReason: data.get("holdReason") || undefined,
            });
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <select name="status" defaultValue={attraction.status} className="ga-field rounded-xl px-2 py-2 text-sm text-ga-ink">
              {ATTRACTION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <input
              name="waitMinutes"
              type="number"
              min={0}
              defaultValue={attraction.waitMinutes ?? 0}
              className="ga-field rounded-xl px-2 py-2 text-sm text-ga-ink"
              aria-label="Wait minutes"
            />
          </div>
          <input
            name="trainsOnTrack"
            type="number"
            min={0}
            placeholder="Units on track"
            defaultValue={attraction.trainsOnTrack ?? ""}
            className="ga-field rounded-xl px-2 py-2 text-sm text-ga-ink"
          />
          <input
            name="holdReason"
            placeholder="Hold / down reason (ops only)"
            defaultValue={attraction.holdReason ?? ""}
            className="ga-field rounded-xl px-2 py-2 text-sm text-ga-ink"
          />
          <button type="submit" disabled={busy} className="ga-btn rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50">
            {busy ? "Sending…" : "Check in position"}
          </button>
        </form>
      ) : null}
    </article>
  );
}
