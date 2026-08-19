"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { GreatAdventureLogo } from "@/components/GreatAdventureLogo";

const ACCOUNTS = [
  { user: "lead", role: "Park lead — full live radio" },
  { user: "westops", role: "Best of the West ride ops — can check in west units" },
  { user: "forestops", role: "Enchanted Forest ride ops" },
  { user: "wall", role: "Guest wall — public statuses only" },
  { user: "flash", role: "Gold Flash Pass holder — reserve return times" },
];

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ga-blue">
            Jackson, New Jersey · 1979 lands
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl leading-tight text-ga-blue">
            Great Adventure ops wall
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ga-ink/75">
            Live attraction status for ride ops. Two browsers share the same board — a check-in on
            Rolling Thunder appears on the other wall without refresh.
          </p>
        </div>
        <GreatAdventureLogo className="hidden h-28 w-auto shrink-0 md:block sm:h-36" />
      </div>

      <form
        className="ga-glass rounded-3xl p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError(null);
          const data = new FormData(event.currentTarget);
          try {
            await api("/api/auth/login", {
              method: "POST",
              body: JSON.stringify({
                username: data.get("username"),
                password: data.get("password"),
              }),
            });
            router.push("/board");
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not sign in");
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-ga-blue">
          Sign in to the radio
        </h2>
        <p className="mt-1 text-sm text-ga-ink/70">Password for every demo roster: park1979</p>
        <label className="mt-6 block text-xs font-semibold uppercase tracking-wide text-ga-blue">
          Username
          <input
            name="username"
            autoComplete="username"
            defaultValue="lead"
            className="ga-field mt-1 w-full rounded-xl px-3 py-3 text-sm"
          />
        </label>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-ga-blue">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            defaultValue="park1979"
            className="ga-field mt-1 w-full rounded-xl px-3 py-3 text-sm"
          />
        </label>
        {error ? <p className="mt-3 text-sm text-ga-blue">{error}</p> : null}
        <button type="submit" disabled={busy} className="ga-btn mt-6 w-full rounded-xl py-3 font-semibold disabled:opacity-50">
          {busy ? "Signing in…" : "Open live wall"}
        </button>
        <ul className="mt-6 space-y-2 text-sm text-ga-ink/80">
          {ACCOUNTS.map((account) => (
            <li key={account.user}>
              <span className="font-mono font-semibold text-ga-green">{account.user}</span> — {account.role}
            </li>
          ))}
        </ul>
      </form>

      <div className="ga-glow relative overflow-hidden rounded-3xl">
        <Image
          src="/images/great-adventure-1979.png"
          alt="Illustrated 1979 map of Six Flags Great Adventure"
          width={1200}
          height={900}
          className="h-auto w-full"
          priority
          unoptimized
        />
      </div>
    </div>
  );
}
