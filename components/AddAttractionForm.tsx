"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { ATTRACTION_KINDS, SITES } from "@/lib/theme-park";

export function AddAttractionForm({ onCreated }: { onCreated: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-ga-green/40 bg-white/70 px-3 py-2 text-sm font-medium text-ga-green"
      >
        Add attraction
      </button>
    );
  }

  return (
    <form
      className="ga-glass grid gap-2 rounded-2xl p-3 md:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        const data = new FormData(event.currentTarget);
        try {
          await api("/api/attractions", {
            method: "POST",
            body: JSON.stringify({
              code: data.get("code"),
              name: data.get("name"),
              kind: data.get("kind"),
              siteCode: data.get("siteCode"),
              unitCode: data.get("unitCode"),
              queueCapacity: Number(data.get("queueCapacity") ?? 0),
            }),
          });
          event.currentTarget.reset();
          setOpen(false);
          onCreated();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not add attraction");
        }
      }}
    >
      <input name="code" required placeholder="Code (e.g. JOKER)" className="ga-field rounded-xl px-3 py-2 text-sm" />
      <input name="name" required placeholder="Name" className="ga-field rounded-xl px-3 py-2 text-sm" />
      <select name="siteCode" className="ga-field rounded-xl px-3 py-2 text-sm">
        {SITES.map((site) => (
          <option key={site.code} value={site.code}>
            {site.name}
          </option>
        ))}
      </select>
      <input name="unitCode" required placeholder="Unit code" className="ga-field rounded-xl px-3 py-2 text-sm" />
      <select name="kind" className="ga-field rounded-xl px-3 py-2 text-sm">
        {ATTRACTION_KINDS.map((kind) => (
          <option key={kind} value={kind}>
            {kind}
          </option>
        ))}
      </select>
      <input name="queueCapacity" type="number" min={0} placeholder="Queue capacity" className="ga-field rounded-xl px-3 py-2 text-sm" />
      {error ? <p className="col-span-full text-sm text-ga-blue">{error}</p> : null}
      <div className="col-span-full flex gap-2">
        <button type="submit" className="ga-btn rounded-xl px-3 py-2 text-sm font-semibold">
          Create
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-ga-blue">
          Cancel
        </button>
      </div>
    </form>
  );
}
