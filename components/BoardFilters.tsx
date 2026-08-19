"use client";

import { SITES, STATUS_LABELS, type AttractionStatus } from "@/lib/theme-park";

export type Filters = {
  site: string;
  unit: string;
  person: string;
  status: string;
};

export function BoardFilters({
  filters,
  units,
  onChange,
}: {
  filters: Filters;
  units: string[];
  onChange: (next: Filters) => void;
}) {
  return (
    <form className="ga-glass grid gap-3 rounded-2xl p-4 md:grid-cols-4" onSubmit={(event) => event.preventDefault()}>
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ga-blue">
        Site
        <select
          className="ga-field rounded-xl px-3 py-2 text-sm"
          value={filters.site}
          onChange={(event) => onChange({ ...filters, site: event.target.value })}
        >
          <option value="">All lands</option>
          {SITES.map((site) => (
            <option key={site.code} value={site.code}>
              {site.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ga-blue">
        Unit
        <select
          className="ga-field rounded-xl px-3 py-2 text-sm"
          value={filters.unit}
          onChange={(event) => onChange({ ...filters, unit: event.target.value })}
        >
          <option value="">All units</option>
          {units.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ga-blue">
        Person
        <input
          className="ga-field rounded-xl px-3 py-2 text-sm"
          placeholder="Ops name or id"
          value={filters.person}
          onChange={(event) => onChange({ ...filters, person: event.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ga-blue">
        Status
        <select
          className="ga-field rounded-xl px-3 py-2 text-sm"
          value={filters.status}
          onChange={(event) => onChange({ ...filters, status: event.target.value })}
        >
          <option value="">Any status</option>
          {(Object.keys(STATUS_LABELS) as AttractionStatus[]).map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
