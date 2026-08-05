"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { getCurrentProfile } from "../../lib/auth";
import {
  getPendingPetitions,
  approvePetition,
  rejectPetition,
} from "../../lib/petitions";
import type { Petition } from "../../types/database.types";

export default function AdminPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  const [petitions, setPetitions] = useState<Petition[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tracks which petition is mid-action, and which one has its reject-note
  // input open, so the UI can disable buttons / show the note field per-row.
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUser(data.user);

      const profile = await getCurrentProfile();
      if (profile?.role !== "admin") {
        setChecking(false);
        setAuthorized(false);
        return;
      }

      setAuthorized(true);
      setChecking(false);
      loadQueue();
    }

    check();
  }, [router]);

  async function loadQueue() {
    setLoadingQueue(true);
    try {
      const pending = await getPendingPetitions();
      setPetitions(pending);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Couldn't load the review queue.";
      setError(message);
    } finally {
      setLoadingQueue(false);
    }
  }

  async function handleApprove(petitionId: string) {
    if (!user) return;
    setBusyId(petitionId);
    setError(null);
    try {
      await approvePetition(petitionId, user.id);
      setPetitions((prev) => prev.filter((p) => p.id !== petitionId));
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Approval failed.";
      setError(message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(petitionId: string) {
    if (!user) return;
    setBusyId(petitionId);
    setError(null);
    try {
      await rejectPetition(petitionId, user.id, rejectNote.trim());
      setPetitions((prev) => prev.filter((p) => p.id !== petitionId));
      setRejectingId(null);
      setRejectNote("");
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Rejection failed.";
      setError(message);
    } finally {
      setBusyId(null);
    }
  }

  if (checking) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-neutral-500">
        Checking access...
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-sm text-neutral-500">
          You don&apos;t have access to this page.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold">Review queue</h1>
      <p className="mb-6 text-sm text-neutral-500">
        {petitions.length} petition{petitions.length === 1 ? "" : "s"} awaiting review.
      </p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loadingQueue ? (
        <p className="text-sm text-neutral-500">Loading queue...</p>
      ) : petitions.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500">
          Nothing pending — the queue is clear.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {petitions.map((p) => (
            <li key={p.id} className="rounded-lg border border-neutral-200 p-4">
              <h2 className="mb-1 font-semibold">{p.title}</h2>
              <p className="mb-2 text-sm text-neutral-600">{p.description}</p>
              <div className="mb-3 flex items-center gap-3 text-xs text-neutral-400">
                {p.category && <span>{p.category}</span>}
                {p.location_label && <span>· {p.location_label}</span>}
                <span>· {new Date(p.created_at).toLocaleDateString()}</span>
              </div>

              {rejectingId === p.id ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="Reason shown to the creator (required)"
                    rows={2}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-red-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReject(p.id)}
                      disabled={busyId === p.id || rejectNote.trim().length === 0}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {busyId === p.id ? "Rejecting..." : "Confirm reject"}
                    </button>
                    <button
                      onClick={() => {
                        setRejectingId(null);
                        setRejectNote("");
                      }}
                      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(p.id)}
                    disabled={busyId === p.id}
                    className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
                  >
                    {busyId === p.id ? "Approving..." : "Approve"}
                  </button>
                  <button
                    onClick={() => setRejectingId(p.id)}
                    disabled={busyId === p.id}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
