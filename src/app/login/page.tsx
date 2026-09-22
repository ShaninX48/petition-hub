"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justSignedUp = searchParams.get("justSignedUp") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/");
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-10">
      <div className="case-number mb-2 text-center">Member access</div>
      <h1 className="font-display text-center text-2xl sm:text-3xl" style={{ color: "var(--color-navy)" }}>
        Welcome back
      </h1>
      <p className="mb-6 mt-1 text-center text-sm" style={{ color: "var(--color-ink-muted)" }}>
        Log in to sign and file petitions.
      </p>

      {justSignedUp && (
        <p className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ border: "1px solid var(--color-seal-green)", color: "var(--color-seal-green)" }}>
          ✓ Account created. If email confirmation is required, check your inbox before logging in.
        </p>
      )}

      <form onSubmit={handleSubmit} className="card-file flex flex-col gap-4 p-5 sm:p-6">
        <div>
          <label htmlFor="email" className="label-official">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input-official"
          />
        </div>

        <div>
          <label htmlFor="password" className="label-official">Password</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="input-official"
          />
        </div>

        {error && (
          <p className="rounded-lg px-3 py-2 text-sm" style={{ color: "var(--color-seal-red)", border: "1px solid var(--color-seal-red)" }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-official btn-primary" style={{ padding: "12px", opacity: loading ? 0.6 : 1 }}>
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: "var(--color-ink-muted)" }}>
        Don&apos;t have an account?{" "}
        <a href="/signup" style={{ color: "var(--color-navy)", fontWeight: 600, textDecoration: "underline" }}>
          Sign up
        </a>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
