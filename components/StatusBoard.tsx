"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { canCreateAttraction, canHoldFlashPass, siteByCode, type Operator } from "@/lib/theme-park";
import { FlashPassPanel } from "./FlashPassPanel";
import { AddAttractionForm } from "./AddAttractionForm";
import { AttractionStatusList } from "./AttractionStatusList";
import { BoardFilters, type Filters } from "./BoardFilters";
import { ConnectionBanner } from "./ConnectionBanner";
import { EventLog } from "./EventLog";
import { PresenceRail } from "./PresenceRail";
import { StaleAlerts } from "./StaleAlerts";
import { useLiveBoard } from "./useLiveBoard";

function matches(filters: Filters, name: string, id: string | null) {
  const q = filters.person.trim().toLowerCase();
  if (!q) return true;
  return name.toLowerCase().includes(q) || (id ?? "").toLowerCase().includes(q);
}

export function StatusBoard({ operator }: { operator: Operator }) {
  const router = useRouter();
  const { attractions, events, watchers, connection, burstNotice, setAttractions } =
    useLiveBoard(operator);
  const [filters, setFilters] = useState<Filters>({
    site: operator.siteCode ?? "",
    unit: "",
    person: "",
    status: "",
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const units = useMemo(
    () => [...new Set(attractions.map((item) => item.unitCode))].sort(),
    [attractions],
  );

  const visible = attractions.filter((item) => {
    if (filters.site && item.siteCode !== filters.site) return false;
    if (filters.unit && item.unitCode !== filters.unit) return false;
    if (filters.status && item.publicStatus !== filters.status && item.status !== filters.status) {
      return false;
    }
    if (
      filters.person &&
      !matches(filters, item.assignedOperatorName ?? "", item.assignedOperatorId) &&
      !matches(filters, item.reportedByName ?? "", item.reportedById)
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6">
      <header className="ga-glass flex flex-col gap-4 rounded-[2rem] p-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-ga-green">
            Six Flags · Jackson, NJ
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl text-ga-blue md:text-5xl">
            Great Adventure live wall
          </h1>
          <p className="mt-1 text-sm text-ga-ink/70">
            Signed in as <span className="font-bold text-ga-blue">{operator.displayName}</span>
            {operator.role === "flash_pass" ? " · Gold Flash Pass" : ""}
            {operator.siteCode ? ` · ${siteByCode(operator.siteCode)?.name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canCreateAttraction(operator.role) ? (
            <AddAttractionForm
              onCreated={() => {
                /* snapshot/SSE will attach the new row */
              }}
            />
          ) : null}
          <button
            type="button"
            className="rounded-full border border-ga-blue/25 bg-white/80 px-4 py-2 text-sm font-bold text-ga-blue"
            onClick={async () => {
              await api("/api/auth/logout", { method: "POST" });
              router.push("/login");
              router.refresh();
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <ConnectionBanner state={connection} burstNotice={burstNotice} />
      <StaleAlerts attractions={visible} />
      <BoardFilters filters={filters} units={units} onChange={setFilters} />
      {error ? <p className="text-sm font-semibold text-ga-blue">{error}</p> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <AttractionStatusList
          attractions={visible}
          operator={operator}
          busyId={busyId}
          onReport={async (id, body) => {
            setBusyId(id);
            setError(null);
            try {
              const data = await api<{ attraction: (typeof attractions)[number] }>(
                `/api/attractions/${id}/status`,
                { method: "POST", body: JSON.stringify(body) },
              );
              setAttractions((current) =>
                current.map((row) => (row.id === id ? { ...row, ...data.attraction } : row)),
              );
            } catch (err) {
              setError(err instanceof Error ? err.message : "Check-in failed");
            } finally {
              setBusyId(null);
            }
          }}
          onReserve={async (id) => {
            setBusyId(id);
            setError(null);
            try {
              const data = await api<{
                attraction: (typeof attractions)[number];
                reservation: NonNullable<(typeof attractions)[number]["myReservation"]>;
              }>("/api/reservations", {
                method: "POST",
                body: JSON.stringify({ attractionId: id, partySize: 1 }),
              });
              setAttractions((current) =>
                current.map((row) =>
                  row.id === id
                    ? { ...row, ...data.attraction, myReservation: data.reservation }
                    : row,
                ),
              );
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not reserve a return time");
            } finally {
              setBusyId(null);
            }
          }}
          onCancelReservation={async (reservationId) => {
            setBusyId(reservationId);
            setError(null);
            try {
              const data = await api<{ attraction: (typeof attractions)[number] }>(
                `/api/reservations/${reservationId}/cancel`,
                { method: "POST" },
              );
              setAttractions((current) =>
                current.map((row) =>
                  row.myReservation?.id === reservationId
                    ? { ...row, ...data.attraction, myReservation: null }
                    : row.id === data.attraction.id
                      ? { ...row, ...data.attraction, myReservation: null }
                      : row,
                ),
              );
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not release that return time");
            } finally {
              setBusyId(null);
            }
          }}
        />
        <div className="flex flex-col gap-4">
          {canHoldFlashPass(operator.role) ? (
            <FlashPassPanel
              reservations={attractions
                .map((item) => item.myReservation)
                .filter((item): item is NonNullable<typeof item> => Boolean(item))}
              busyId={busyId}
              onCancel={async (reservationId) => {
                setBusyId(reservationId);
                setError(null);
                try {
                  await api(`/api/reservations/${reservationId}/cancel`, { method: "POST" });
                  setAttractions((current) =>
                    current.map((row) =>
                      row.myReservation?.id === reservationId ? { ...row, myReservation: null } : row,
                    ),
                  );
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not release that return time");
                } finally {
                  setBusyId(null);
                }
              }}
            />
          ) : null}
          <PresenceRail watchers={watchers} />
          <EventLog events={events} />
        </div>
      </div>
    </div>
  );
}
