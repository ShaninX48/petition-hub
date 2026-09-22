"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase";
import { createPetition } from "../../../lib/petitions";

const CATEGORIES = [
  "Road & Traffic",
  "Safety",
  "Environment",
  "Campus",
  "Utilities",
  "Other",
];

export default function NewPetitionPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [locationLabel, setLocationLabel] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUser(data.user);
      setCheckingAuth(false);
    });
  }, [router]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Your browser doesn't support location detection.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        )
          .then((res) => (res.ok ? res.json() : null))
          .then((geo) => {
            if (!geo) return;
            const parts = [geo.locality || geo.city, geo.principalSubdivision].filter(Boolean);
            const unique = [...new Set(parts)];
            if (unique.length > 0) {
              setLocationLabel((prev) => prev || unique.join(", "));
            }
          })
          .catch(() => {})
          .finally(() => setLocating(false));
      },
      () => {
        setError("Couldn't get your location — you can still add a text label.");
        setLocating(false);
      }
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;

    setError(null);
    setLoading(true);

    try {
      await createPetition({
        title,
        description,
        creator_id: user.id,
        category,
        location_label: locationLabel || null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      });
      router.push("/dashboard");
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Something went wrong.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton mt-4 h-64" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <div className="case-number mb-2">New filing</div>
      <h1 className="font-display text-2xl sm:text-3xl" style={{ color: "var(--color-navy)" }}>
        File a petition
      </h1>
      <p className="mb-6 mt-1 text-sm" style={{ color: "var(--color-ink-muted)" }}>
        Every submission is reviewed by an admin before it goes public. Track its status on your dashboard.
      </p>

      <form onSubmit={handleSubmit} className="card-file flex flex-col gap-5 p-5 sm:p-6">
        <div>
          <label htmlFor="title" className="label-official">
            Title · {title.length}/120
          </label>
          <input
            id="title"
            type="text"
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Fix the unannounced roadblock on Mirpur Road"
            className="input-official"
          />
        </div>

        <div>
          <label htmlFor="description" className="label-official">
            Description · {description.length} chars
          </label>
          <textarea
            id="description"
            required
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What happened, where, who is affected — this is what the admin reviews first."
            className="input-official"
            style={{ resize: "vertical" }}
          />
        </div>

        <div>
          <label htmlFor="category" className="label-official">
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`chip ${category === c ? "chip-active" : ""}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="locationLabel" className="label-official">
            Location
          </label>
          <input
            id="locationLabel"
            type="text"
            value={locationLabel}
            onChange={(e) => setLocationLabel(e.target.value)}
            placeholder="e.g. Mirpur 10, Dhaka"
            className="input-official mb-2"
          />
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="btn-official btn-ghost w-full sm:w-auto"
            style={{ padding: "9px 16px", opacity: locating ? 0.6 : 1 }}
          >
            {locating
              ? "📍 Getting your location..."
              : coords
                ? `📍 Pinned ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)} — update?`
                : "📍 Use my current location"}
          </button>
        </div>

        {error && (
          <p className="rounded-lg px-4 py-3 text-sm" style={{ color: "var(--color-seal-red)", border: "1px solid var(--color-seal-red)" }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-official btn-brass" style={{ padding: "13px", fontSize: 13, opacity: loading ? 0.6 : 1 }}>
          {loading ? "Submitting for review…" : "📨 Submit for review"}
        </button>
      </form>
    </main>
  );
}
