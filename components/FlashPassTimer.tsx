"use client";

import { useEffect, useState } from "react";
import type { FlashReservation } from "@/lib/theme-park";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}

export function flashTimerState(reservation: FlashReservation, now: number) {
  const start = new Date(reservation.returnStartAt).getTime();
  const end = new Date(reservation.returnEndAt).getTime();
  if (now < start) {
    return {
      phase: "until" as const,
      label: "Walk back in",
      remaining: formatCountdown(start - now),
    };
  }
  if (now < end) {
    return {
      phase: "window" as const,
      label: "Scan window",
      remaining: formatCountdown(end - now),
    };
  }
  return {
    phase: "expired" as const,
    label: "Window closed",
    remaining: "0:00",
  };
}

export function useFlashClock() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

export function FlashPassWaitLabel({ reservation }: { reservation: FlashReservation }) {
  const now = useFlashClock();
  if (now == null) return <span>-- min</span>;
  const start = new Date(reservation.returnStartAt).getTime();
  const end = new Date(reservation.returnEndAt).getTime();
  if (now < start) {
    return <span>{formatCountdown(start - now)}</span>;
  }
  if (now < end) {
    return <span>Scan {formatCountdown(end - now)}</span>;
  }
  return <span>Closed</span>;
}

export function FlashPassTimer({ reservation }: { reservation: FlashReservation }) {
  const now = useFlashClock();
  if (now == null) {
    return (
      <p className="font-mono text-2xl font-semibold tabular-nums text-ga-blue">--:--</p>
    );
  }
  const timer = flashTimerState(reservation, now);
  return (
    <div className="mt-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ga-blue/70">{timer.label}</p>
      <p
        className={`font-mono text-3xl font-semibold tabular-nums leading-none ${
          timer.phase === "window" ? "text-ga-green" : timer.phase === "expired" ? "text-ga-ink/40" : "text-ga-blue"
        }`}
      >
        {timer.remaining}
      </p>
    </div>
  );
}
