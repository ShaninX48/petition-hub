"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { getMyPetitions } from "../../lib/petitions";
import type { Petition, PetitionStatus } from "../../types/database.types";
import StampBadge from "../../components/StampBadge";

const STATUS_LABELS: Record<PetitionStatus, string> = {
  pending: "Pending review",
  green: "Verified — live",
  red: "Not verified",
  closed: "Closed",
};

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [petitions, setPetitions] = useState<Petition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUser(data.user);

      try {
        const mine = await getMyPetitions(data.user.id);
        setPetitions(mine);
      } catch (err) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : "Couldn't load your petitions.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="case-number mb-2">Your docket</div>
        <div className="skeleton mb-4 h-8 w-48" />
        <ul className="flex flex-col gap-4">
          <li className="skeleton h-28" />
          <li className="skeleton h-28" />
        </ul>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="case-number mb-2">Your docket</div>
          <h1 className="font-display text-2xl sm:text-3xl" style={{ color: "var(--color-navy)" }}>
            Your petitions
          </h1>
          {user && (
            <p className="font-mono-tight mt-1 text-xs" style={{ color: "var(--color-ink-muted)" }}>
              {user.email?.toUpperCase()}
            </p>
          )}
        </div>
        <a href="/petitions/new" className="btn-official btn-brass shrink-0 text-center" style={{ padding: "10px 20px" }}>
          ＋ New petition
        </a>
      </div>

      {error && (
        <p className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ color: "var(--color-seal-red)", border: "1px solid var(--color-seal-red)" }}>
          {error}
        </p>
      )}

      {petitions.length === 0 ? (
        <div className="px-4 py-12 text-center" style={{ border: "1px dashed var(--color-paper-line)", borderRadius: 12 }}>
          <div className="text-4xl">📝</div>
          <p className="mt-3 text-sm" style={{ color: "var(--color-ink-muted)" }}>
            You haven&apos;t filed anything yet.
          </p>
          <a href="/petitions/new" className="btn-official btn-primary mt-4 inline-block" style={{ padding: "10px 20px" }}>
            File your first petition
          </a>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {petitions.map((p) => (
            <li key={p.id} className="card-file p-5">
              <div className="mb-2 flex items-start justify-between gap-3">
                <span
                  className="font-mono-tight rounded-full px-3 py-1"
                  style={{ fontSize: 11, border: "1px solid var(--color-paper-line)", color: "var(--color-navy)" }}
                >
                  {STATUS_LABELS[p.status].toUpperCase()}
                </span>
                <StampBadge status={p.status} size="sm" />
              </div>
              <h2 className="font-display mb-1 text-lg" style={{ color: "var(--color-ink)" }}>{p.title}</h2>
              <p className="mb-2 line-clamp-2 text-sm" style={{ color: "var(--color-ink-muted)" }}>{p.description}</p>
              <div className="font-mono-tight flex flex-wrap items-center gap-2 text-xs" style={{ fontSize: 11, color: "var(--color-ink-muted)" }}>
                {p.category && <span>{p.category.toUpperCase()}</span>}
                {p.location_label && <span>· {p.location_label.toUpperCase()}</span>}
                <span>· {new Date(p.created_at).toLocaleDateString()}</span>
              </div>
              {p.status === "red" && p.admin_note && (
                <p className="mt-3 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--color-paper)", border: "1px solid var(--color-seal-red)", color: "var(--color-seal-red)" }}>
                  Admin note: {p.admin_note}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
