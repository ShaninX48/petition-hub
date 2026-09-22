"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  return `PH-${new Date().getFullYear()}-${id.slice(0, 6).toUpperCase()}`;
}

const GOAL = 500;

function progressOf(total: number): number {
  return Math.min(100, Math.round((total / GOAL) * 100));
}

function SignatureLine({ p }: { p: TrendingPetition | NearbyPetition }) {
  return (
    <span className="font-mono-tight text-xs sm:text-sm" style={{ color: "var(--color-navy)" }}>
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

function SkeletonCard() {
  return (
    <li className="card-file p-5">
      <div className="skeleton mb-3 h-3 w-28" />
      <div className="skeleton mb-2 h-5 w-3/4" />
      <div className="skeleton mb-4 h-4 w-full" />
      <div className="flex items-center justify-between pt-2">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton h-9 w-28" />
      </div>
    </li>
  );
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [petitions, setPetitions] = useState<TrendingPetition[]>([]);
  const [nearby, setNearby] = useState<NearbyPetition[]>([]);
  const [locating, setLocating] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [nearbyTried, setNearbyTried] = useState(false);
  const [signedIds, setSignedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const trending = await withTimeout(getTrendingPetitions(), LOAD_TIMEOUT_MS, "Loading petitions");
      setPetitions(trending);

      const { data } = await withTimeout(supabase.auth.getUser(), LOAD_TIMEOUT_MS, "Auth check");
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

  const categories = useMemo(() => {
    const set = new Set<string>();
    petitions.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["All", ...Array.from(set).sort()];
  }, [petitions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return petitions.filter((p) => {
      if (category !== "All" && p.category !== category) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.location_label ?? "").toLowerCase().includes(q)
      );
    });
  }, [petitions, query, category]);

  const totalSignatures = useMemo(
    () => petitions.reduce((sum, p) => sum + p.total_signatures, 0),
    [petitions]
  );

  function findNearby() {
    if (!navigator.geolocation) {
      setNearbyError("Your browser doesn't support location detection.");
      return;
    }
    setLocating(true);
    setNearbyError(null);
    setNearbyTried(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const results = await withTimeout(
            getNearbyPetitions(pos.coords.latitude, pos.coords.longitude, 10),
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
        prev.map((p) => (p.id === petitionId ? { ...p, total_signatures: p.total_signatures + 1 } : p))
      );
      setNearby((prev) =>
        prev.map((p) => (p.id === petitionId ? { ...p, total_signatures: p.total_signatures + 1 } : p))
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
      <ul className="flex flex-col gap-4 sm:gap-5">
        {list.map((p) => {
          const alreadySigned = signedIds.has(p.id);
          return (
            <li key={p.id} className="card-file p-5 sm:p-6">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="case-number">CASE No. {caseNumber(p.id)}</div>
                <StampBadge status="green" size="sm" />
              </div>

              <h2 className="font-display mb-1 text-lg leading-snug sm:text-xl" style={{ color: "var(--color-ink)" }}>
                {p.title}
              </h2>
              <p className="mb-3 line-clamp-3 text-sm leading-relaxed" style={{ color: "var(--color-ink-muted)" }}>
                {p.description}
              </p>

              <div
                className="font-mono-tight mb-3 flex flex-wrap items-center gap-x-2 gap-y-1"
                style={{ fontSize: 11, color: "var(--color-ink-muted)" }}
              >
                {p.category && (
                  <span
                    className="rounded-full px-2 py-0.5"
                    style={{ border: "1px solid var(--color-paper-line)" }}
                  >
                    {p.category.toUpperCase()}
                  </span>
                )}
                {p.location_label && <span>📍 {p.location_label.toUpperCase()}</span>}
                <span>· FILED {new Date(p.created_at).toLocaleDateString()}</span>
              </div>

              <div className="progress-track mb-3" aria-label={`${progressOf(p.total_signatures)}% of goal`}>
                <div className="progress-fill" style={{ width: `${progressOf(p.total_signatures)}%` }} />
              </div>

              <div
                className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"
                style={{ borderColor: "var(--color-paper-line)" }}
              >
                <SignatureLine p={p} />
                <button
                  onClick={() => handleSign(p.id)}
                  disabled={alreadySigned || signingId === p.id}
                  className={`btn-official ${alreadySigned ? "btn-ghost" : "btn-primary"}`}
                  style={{ padding: "10px 20px", opacity: signingId === p.id ? 0.6 : 1 }}
                >
                  {alreadySigned ? "✓ Signed" : signingId === p.id ? "Signing…" : "Sign petition"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4">
      {/* Hero */}
      <section
        className="hero-texture mt-6 rounded-2xl px-6 py-10 text-center sm:px-10 sm:py-14"
        style={{ backgroundColor: "var(--color-navy-deep)", border: "1px solid var(--color-brass)" }}
      >
        <div className="case-number mb-3" style={{ color: "var(--color-brass)" }}>
          Public Register · Verified Only
        </div>
        <h1
          className="font-display mx-auto max-w-xl text-3xl leading-tight sm:text-5xl"
          style={{ color: "#F1F3F1" }}
        >
          Your voice, officially on record.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed sm:text-base" style={{ color: "#C7CDD6" }}>
          File civic petitions, get them verified, and gather signatures that matter.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href="/petitions/new" className="btn-official btn-brass w-full sm:w-auto" style={{ padding: "12px 28px", fontSize: 13 }}>
            ＋ File a petition
          </a>
          <a
            href="#trending"
            className="btn-official w-full sm:w-auto"
            style={{ padding: "12px 28px", fontSize: 13, color: "#F1F3F1", border: "1px solid var(--color-brass)" }}
          >
            Browse petitions
          </a>
        </div>
        {!loading && petitions.length > 0 && (
          <div className="font-mono-tight mx-auto mt-6 flex max-w-md items-center justify-center gap-6" style={{ fontSize: 11, color: "var(--color-brass)" }}>
            <span>{petitions.length} LIVE CASES</span>
            <span>·</span>
            <span>{totalSignatures} TOTAL SIGNATURES</span>
          </div>
        )}
      </section>

      {/* Trending */}
      <section id="trending" className="scroll-mt-24 py-10">
        <div className="mb-2">
          <div className="case-number mb-2">Public Register</div>
          <h2 className="font-display text-2xl sm:text-3xl" style={{ color: "var(--color-navy)" }}>
            Trending petitions
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--color-ink-muted)" }}>
            Verified petitions gaining the most signatures right now.
          </p>
        </div>

        {!loading && petitions.length > 0 && (
          <div className="mt-5 mb-5 flex flex-col gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔍 Search by title, issue, or area…"
              className="input-official"
              aria-label="Search petitions"
            />
            {categories.length > 2 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`chip ${category === c ? "chip-active" : ""}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <div
            className="mb-4 flex flex-wrap items-center gap-3 rounded-lg px-4 py-3"
            style={{ background: "var(--color-paper-raised)", border: "1px solid var(--color-seal-red)" }}
          >
            <p className="text-sm" style={{ color: "var(--color-seal-red)" }}>
              {error}
            </p>
            <button onClick={load} className="btn-official btn-primary" style={{ padding: "6px 14px" }}>
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <ul className="flex flex-col gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </ul>
        ) : petitions.length === 0 ? (
          <div
            className="px-4 py-12 text-center"
            style={{ border: "1px dashed var(--color-paper-line)", borderRadius: 12 }}
          >
            <div className="text-4xl">📋</div>
            <p className="mt-3 text-sm" style={{ color: "var(--color-ink-muted)" }}>
              No verified petitions yet — be the first to{" "}
              <a href="/petitions/new" style={{ color: "var(--color-navy)", textDecoration: "underline" }}>
                file one
              </a>
              .
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="px-4 py-12 text-center"
            style={{ border: "1px dashed var(--color-paper-line)", borderRadius: 12 }}
          >
            <div className="text-4xl">🔍</div>
            <p className="mt-3 text-sm" style={{ color: "var(--color-ink-muted)" }}>
              No matches for “{query}”.{" "}
              <button onClick={() => { setQuery(""); setCategory("All"); }} style={{ color: "var(--color-navy)", textDecoration: "underline" }}>
                Clear filters
              </button>
            </p>
          </div>
        ) : (
          renderList(filtered)
        )}
      </section>

      <div className="rule-double mx-auto" style={{ maxWidth: 120 }} />

      {/* Nearby */}
      <section className="py-10">
        <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="case-number mb-2">Local Register</div>
            <h2 className="font-display text-2xl sm:text-2xl" style={{ color: "var(--color-navy)" }}>
              Nearby petitions
            </h2>
          </div>
          <button
            onClick={findNearby}
            disabled={locating}
            className="btn-official btn-ghost shrink-0"
            style={{ padding: "10px 18px", opacity: locating ? 0.6 : 1 }}
          >
            {locating ? "📍 Finding…" : "📍 Use my location"}
          </button>
        </div>
        <p className="mb-6 text-sm" style={{ color: "var(--color-ink-muted)" }}>
          Verified petitions within 10 km of you.
        </p>

        {nearbyError && (
          <p className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ color: "var(--color-seal-red)", border: "1px solid var(--color-seal-red)" }}>
            {nearbyError}
          </p>
        )}

        {locating ? (
          <ul className="flex flex-col gap-4">
            <SkeletonCard />
          </ul>
        ) : nearby.length === 0 && !nearbyError ? (
          <div
            className="px-4 py-12 text-center"
            style={{ border: "1px dashed var(--color-paper-line)", borderRadius: 12 }}
          >
            <div className="text-4xl">{nearbyTried ? "✅" : "📍"}</div>
            <p className="mt-3 text-sm" style={{ color: "var(--color-ink-muted)" }}>
              {nearbyTried
                ? "No verified petitions within 10 km — try filing one for your area."
                : 'Click "Use my location" to see verified petitions near you.'}
            </p>
            {nearbyTried && nearby.length === 0 && (
              <a href="/petitions/new" className="btn-official btn-brass mt-4 inline-block" style={{ padding: "10px 20px" }}>
                File one for your area
              </a>
            )}
          </div>
        ) : (
          renderList(nearby)
        )}
      </section>
    </main>
  );
}
