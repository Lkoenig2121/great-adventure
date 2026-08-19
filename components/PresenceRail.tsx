"use client";

export type PresenceWatcher = {
  id: string;
  operatorId: string;
  displayName: string;
  role: string;
  sessionId: string;
  attractionId: string | null;
  siteCode: string | null;
};

export function PresenceRail({ watchers }: { watchers: PresenceWatcher[] }) {
  return (
    <section className="ga-glass rounded-3xl px-4 py-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-ga-blue">On the wall</h2>
      <p className="mt-1 text-xs text-ga-ink/55">
        {watchers.length} live session{watchers.length === 1 ? "" : "s"}
      </p>
      <ul className="mt-3 space-y-2 text-sm text-ga-ink">
        {watchers.length === 0 ? (
          <li className="text-ga-ink/55">No ops signed in on this radio.</li>
        ) : (
          watchers.map((watcher) => (
            <li key={watcher.id} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-ga-green shadow-[0_0_10px_var(--ga-green)]" />
              <span>
                {watcher.displayName}
                <span className="block text-[11px] uppercase tracking-wide text-ga-blue/70">
                  {watcher.role.replace("_", " ")}
                  {watcher.siteCode ? ` · ${watcher.siteCode}` : ""}
                </span>
              </span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
