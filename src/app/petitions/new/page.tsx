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
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
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
      <main className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-neutral-500">
        Checking your session...
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold">Create a petition</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Every submission is reviewed by an admin before it goes public. You&apos;ll be able to
        track its status on your dashboard.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium">
            Title
          </label>
          <input
            id="title"
            type="text"
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Fix the unannounced roadblock on Mirpur Road"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
          />
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            required
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain the issue clearly — this is what the admin reviews first."
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
          />
        </div>

        <div>
          <label htmlFor="category" className="mb-1 block text-sm font-medium">
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="locationLabel" className="mb-1 block text-sm font-medium">
            Location
          </label>
          <input
            id="locationLabel"
            type="text"
            value={locationLabel}
            onChange={(e) => setLocationLabel(e.target.value)}
            placeholder="e.g. Mirpur 10, Dhaka"
            className="mb-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
          />
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="text-xs font-medium text-teal-700 hover:underline disabled:opacity-60"
          >
            {locating
              ? "Getting your location..."
              : coords
              ? `Pinned: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)} — update?`
              : "Use my current location"}
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {loading ? "Submitting..." : "Submit for review"}
        </button>
      </form>
    </main>
  );
}
