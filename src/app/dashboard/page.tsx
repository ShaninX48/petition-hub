"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { getMyPetitions } from "../../lib/petitions";
import type { Petition, PetitionStatus } from "../../types/database.types";

const STATUS_STYLES: Record<PetitionStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  green: "bg-teal-100 text-teal-800",
  red: "bg-red-100 text-red-800",
  closed: "bg-neutral-200 text-neutral-700",
};

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
      <main className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-neutral-500">
        Loading your petitions...
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your petitions</h1>
          {user && <p className="text-sm text-neutral-500">{user.email}</p>}
        </div>
        <a
          href="/petitions/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        >
          + New petition
        </a>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {petitions.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500">
          You haven&apos;t created any petitions yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {petitions.map((p) => (
            <li
              key={p.id}
              className="rounded-lg border border-neutral-200 p-4"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <h2 className="font-semibold">{p.title}</h2>
                <span
                  className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[p.status]}`}
                >
                  {STATUS_LABELS[p.status]}
                </span>
              </div>
              <p className="mb-2 text-sm text-neutral-600">{p.description}</p>
              <div className="flex items-center gap-3 text-xs text-neutral-400">
                {p.category && <span>{p.category}</span>}
                {p.location_label && <span>· {p.location_label}</span>}
                <span>· {new Date(p.created_at).toLocaleDateString()}</span>
              </div>
              {p.status === "red" && p.admin_note && (
                <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
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
