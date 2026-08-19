"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Operator } from "@/lib/theme-park";
import { StatusBoard } from "@/components/StatusBoard";

export function BoardGate() {
  const router = useRouter();
  const [operator, setOperator] = useState<Operator | null>(null);

  useEffect(() => {
    void api<{ operator: Operator }>("/api/auth/me")
      .then((data) => setOperator(data.operator))
      .catch(() => router.replace("/login"));
  }, [router]);

  if (!operator) {
    return <p className="p-8 text-ga-ink/70">Checking roster…</p>;
  }
  return <StatusBoard operator={operator} />;
}
