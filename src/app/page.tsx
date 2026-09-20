"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import {
  getTrendingPetitions,
  getNearbyPetitions,
  getMySignedPetitionIds,
  signPetition,
} from "../lib/petitions";
import type { TrendingPetition, NearbyPetition } from "../types/database.types";
import StampBadge from "../components/StampBadge";

function caseNumber(id: string): string {
  // Short, stable, human-scannable "registry number" derived from the id.
  return `PH-${new Date().getFullYear()}-${id.slice(0, 6).toUpperCase()}`;
}

function SignatureLine({ p }: { p: TrendingPetition | NearbyPetition }) {
  return (
    <span className="font-mono-tight text-sm" style={{ color: "var(--color-navy)" }}>
      {p.total_signatures} SIGNATURE{p.total_signatures === 1 ? "" : "S"}
      {"recent_signatures" in p && p.recent_signatures > 0 && (
        <span style={{ color: "var(--color-ink-muted)" }}> · +{p.recent_signatures} THIS WEEK</span>
      )}
      {"distance_km" in p && (
        <span style={{ color: "var(--color-ink-muted)" }}> · {p.distance_km.toFixed(1)} KM AWAY</span>
      )}
    </span>
  );
}

const LOAD_TIMEOUT_MS = 10000;

// Rejects if the Supabase request hangs (e.g. paused project, network
// stall) so the UI never sticks on "Loading…" forever.
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(
            `${label} timed out after ${ms / 1000}s — server unreachable. Check Supabase project status, then retry.`
          )
        ),
      ms
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [petitions, setPetitions] = useState<TrendingPetition[]>([]);
  const [nearby, setNearby] = useState<NearbyPetition[]>([]);
  const [locating, setLocating] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [signedIds, setSignedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const trending = await withTimeout(
        getTrendingPetitions(),
        LOAD_TIMEOUT_MS,
        "Loading petitions"
      );
      setPetitions(trending);

      const { data } = await withTimeout(
        supabase.auth.getUser(),
        LOAD_TIMEOUT_MS,
        "Auth check"
      );
      if (data.user) {
        setUser(data.user);
        const signed = await withTimeout(
          getMySignedPetitionIds(data.user.id),
          LOAD_TIMEOUT_MS,
          "Loading your signatures"
        );
        setSignedIds(signed);
      }
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Couldn't load petitions.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function findNearby() {
    if (!navigator.geolocation) {
      setNearbyError("Your browser doesn't support location detection.");
      return;
    }
    setLocating(true);
    setNearbyError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const results = await withTimeout(
            getNearbyPetitions(
              pos.coords.latitude,
              pos.coords.longitude,
              10
            ),
            LOAD_TIMEOUT_MS,
            "Loading nearby petitions"
          );
          setNearby(results);
        } catch (err) {
          const message =
            err && typeof err === "object" && "message" in err
              ? String((err as { message: unknown }).message)
              : "Couldn't load nearby petitions.";
          setNearbyError(message);
        } finally {
          setLocating(false);
        }
      },
      (geoError) => {
        const messages: Record<number, string> = {
          1: "Location permission denied — allow location access and try again.",
          2: "Location unavailable — check your device's location settings.",
          3: "Location request timed out — try again.",
        };
        setNearbyError(messages[geoError.code] ?? "Couldn't get your location.");
        setLocating(false);
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }

  async function handleSign(petitionId: string) {
    if (!user) {
      window.location.href = "/login";
      return;
    }

    setSigningId(petitionId);
    setError(null);
    try {
      await signPetition(petitionId, user.id);
      setSignedIds((prev) => new Set(prev).add(petitionId));
      setPetitions((prev) =>
        prev.map((p) =>
          p.id === petitionId ? { ...p, total_signatures: p.total_signatures + 1 } : p
        )
      );
      setNearby((prev) =>
        prev.map((p) =>
          p.id === petitionId ? { ...p, total_signatures: p.total_signatures + 1 } : p
        )
      );
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Couldn't sign this petition.";
      setError(message);
    } finally {
      setSigningId(null);
    }
  }

  function renderList(list: (TrendingPetition | NearbyPetition)[]) {
    return (
      <ul className="flex flex-col gap-5">
        {list.map((p) => {
          const alreadySigned = signedIds.has(p.id);
          return (
            <li key={p.id} className="card-file p-5 pr-24">
              <div className="case-number mb-2">CASE No. {caseNumber(p.id)}</div>

              <div style={{ position: "absolute", top: 14, right: 14 }}>
                <StampBadge status="green" size="sm" />
              </div>

              <h2 className="font-display mb-1 text-lg" style={{ color: "var(--color-ink)" }}>
                {p.title}
              </h2>
              <p className="mb-3 text-sm" style={{ color: "var(--color-ink-muted)" }}>
                {p.description}
              </p>

              <div
                className="font-mono-tight mb-4 flex flex-wrap items-center gap-x-3 gap-y-1"
                style={{ fontSize: 11, color: "var(--color-ink-muted)" }}
              >
                {p.category && <span>{p.category.toUpperCase()}</span>}
                {p.location_label && <span>· {p.location_label.toUpperCase()}</span>}
                <span>· FILED {new Date(p.created_at).toLocaleDateString()}</span>
              </div>

              <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: "var(--color-paper-line)" }}>
                <SignatureLine p={p} />

                <button
                  onClick={() => handleSign(p.id)}
                  disabled={alreadySigned || signingId === p.id}
                  className="btn-official"
                  style={{
                    padding: "8px 16px",
                    color: alreadySigned ? "var(--color-ink-muted)" : "#F1F3F1",
                    background: alreadySigned ? "var(--color-paper-line)" : "var(--color-navy)",
                    opacity: signingId === p.id ? 0.6 : 1,
                  }}
                >
                  {alreadySigned ? "Signed" : signingId === p.id ? "Signing…" : "Sign petition"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <div className="case-number mb-2">PUBLIC REGISTER</div>
        <h1 className="font-display text-3xl" style={{ color: "var(--color-navy)" }}>
          Trending petitions
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-ink-muted)" }}>
          Verified petitions gaining the most signatures right now.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p className="text-sm" style={{ color: "var(--color-seal-red)" }}>
            {error}
          </p>
          <button onClick={load} className="btn-official" style={{ padding: "6px 14px" }}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
          Loading…
        </p>
      ) : petitions.length === 0 ? (
        <p
          className="px-4 py-8 text-center text-sm"
          style={{ border: "1px dashed var(--color-paper-line)", color: "var(--color-ink-muted)" }}
        >
          No verified petitions yet — be the first to{" "}
          <a href="/petitions/new" style={{ color: "var(--color-navy)", textDecoration: "underline" }}>
            file one
          </a>
          .
        </p>
      ) : (
        renderList(petitions)
      )}

      <div className="rule-double my-10" style={{ maxWidth: 120 }} />

      <div className="mb-1 flex items-center justify-between">
        <div>
          <div className="case-number mb-2">LOCAL REGISTER</div>
          <h2 className="font-display text-2xl" style={{ color: "var(--color-navy)" }}>
            Nearby petitions
          </h2>
        </div>
        <button
          onClick={findNearby}
          disabled={locating}
          className="btn-official"
          style={{ color: "var(--color-navy)", padding: "6px 4px", opacity: locating ? 0.6 : 1 }}
        >
          {locating ? "Finding…" : "Use my location"}
        </button>
      </div>
      <p className="mb-6 text-sm" style={{ color: "var(--color-ink-muted)" }}>
        Verified petitions within 10 km of you.
      </p>

      {nearbyError && (
        <p className="mb-4 text-sm" style={{ color: "var(--color-seal-red)" }}>
          {nearbyError}
        </p>
      )}

      {nearby.length === 0 && !nearbyError ? (
        <p
          className="px-4 py-8 text-center text-sm"
          style={{ border: "1px dashed var(--color-paper-line)", color: "var(--color-ink-muted)" }}
        >
          Click &quot;Use my location&quot; to see verified petitions near you.
        </p>
      ) : (
        renderList(nearby)
      )}
    </main>
  );
}
