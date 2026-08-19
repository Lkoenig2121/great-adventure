"use client";

import type { ConnectionState } from "./useLiveBoard";

const COPY: Record<ConnectionState, { title: string; detail: string; tone: string }> = {
  live: {
    title: "Radio live",
    detail: "Both walls will see check-ins without refresh.",
    tone: "border-ga-green/40 bg-white/75 text-ga-green",
  },
  degraded: {
    title: "Degraded link",
    detail: "Showing last known positions. Do not dispatch from this wall until the heartbeat returns.",
    tone: "border-ga-blue/35 bg-white/80 text-ga-blue",
  },
  offline: {
    title: "No radio",
    detail: "Reconnect without reloading if you can. Status below may be stale.",
    tone: "border-ga-blue/50 bg-ga-blue text-white",
  },
  connecting: {
    title: "Raising radio",
    detail: "Opening the live stream…",
    tone: "border-ga-blue/30 bg-white/75 text-ga-blue",
  },
};

export function ConnectionBanner({
  state,
  burstNotice,
}: {
  state: ConnectionState;
  burstNotice: string | null;
}) {
  const copy = COPY[state];
  return (
    <div className="flex flex-col gap-2">
      <div className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${copy.tone}`}>
        <p className="text-xs font-semibold uppercase tracking-wide">{copy.title}</p>
        <p className="mt-1 opacity-90">{copy.detail}</p>
      </div>
      {burstNotice ? (
        <div className="rounded-2xl border border-ga-blue/30 bg-white/80 px-4 py-2 text-sm text-ga-blue">
          {burstNotice}
        </div>
      ) : null}
    </div>
  );
}
