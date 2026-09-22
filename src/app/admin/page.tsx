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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton mt-4 h-28" />
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="text-4xl">🔒</div>
        <h1 className="font-display mt-3 text-2xl" style={{ color: "var(--color-navy)" }}>
          Restricted file
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-ink-muted)" }}>
          You don&apos;t have access to this page.
        </p>
        <a href="/" className="btn-official btn-ghost mt-4 inline-block" style={{ padding: "10px 20px" }}>
          Back to petitions
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="case-number mb-2">Admin · Review desk</div>
      <h1 className="font-display text-2xl sm:text-3xl" style={{ color: "var(--color-navy)" }}>
        Review queue
      </h1>
      <p className="mb-6 mt-1 text-sm" style={{ color: "var(--color-ink-muted)" }}>
        {petitions.length} petition{petitions.length === 1 ? "" : "s"} awaiting review — oldest first.
      </p>

      {error && (
        <p className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ color: "var(--color-seal-red)", border: "1px solid var(--color-seal-red)" }}>
          {error}
        </p>
      )}

      {loadingQueue ? (
        <ul className="flex flex-col gap-4">
          <li className="skeleton h-32" />
          <li className="skeleton h-32" />
        </ul>
      ) : petitions.length === 0 ? (
        <div className="px-4 py-12 text-center" style={{ border: "1px dashed var(--color-paper-line)", borderRadius: 12 }}>
          <div className="text-4xl">✅</div>
          <p className="mt-3 text-sm" style={{ color: "var(--color-ink-muted)" }}>
            Nothing pending — the queue is clear.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {petitions.map((p) => (
            <li key={p.id} className="card-file p-5">
              <div className="case-number mb-2">CASE No. PH-{p.id.slice(0, 6).toUpperCase()}</div>
              <h2 className="font-display mb-1 text-lg" style={{ color: "var(--color-ink)" }}>{p.title}</h2>
              <p className="mb-2 text-sm leading-relaxed" style={{ color: "var(--color-ink-muted)" }}>{p.description}</p>
              <div className="font-mono-tight mb-4 flex flex-wrap items-center gap-2" style={{ fontSize: 11, color: "var(--color-ink-muted)" }}>
                {p.category && <span>{p.category.toUpperCase()}</span>}
                {p.location_label && <span>· {p.location_label.toUpperCase()}</span>}
                <span>· {new Date(p.created_at).toLocaleDateString()}</span>
              </div>

              {rejectingId === p.id ? (
                <div className="flex flex-col gap-2">
                  <label className="label-official" htmlFor={`reject-${p.id}`}>Reason shown to creator (required)</label>
                  <textarea
                    id={`reject-${p.id}`}
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="e.g. Needs a specific location and photo evidence"
                    rows={2}
                    className="input-official"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={() => handleReject(p.id)}
                      disabled={busyId === p.id || rejectNote.trim().length === 0}
                      className="btn-official flex-1"
                      style={{ padding: "10px", color: "#F1F3F1", background: "var(--color-seal-red)", opacity: busyId === p.id ? 0.6 : 1 }}
                    >
                      {busyId === p.id ? "Rejecting..." : "Confirm reject"}
                    </button>
                    <button
                      onClick={() => {
                        setRejectingId(null);
                        setRejectNote("");
                      }}
                      className="btn-official btn-ghost flex-1"
                      style={{ padding: "10px" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={() => handleApprove(p.id)}
                    disabled={busyId === p.id}
                    className="btn-official btn-primary flex-1"
                    style={{ padding: "10px", opacity: busyId === p.id ? 0.6 : 1 }}
                  >
                    {busyId === p.id ? "Approving..." : "✓ Approve & publish"}
                  </button>
                  <button
                    onClick={() => setRejectingId(p.id)}
                    disabled={busyId === p.id}
                    className="btn-official flex-1"
                    style={{ padding: "10px", color: "var(--color-seal-red)", border: "1px solid var(--color-seal-red)", background: "transparent" }}
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
