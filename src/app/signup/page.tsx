"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    router.push("/login?justSignedUp=1");
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-10">
      <div className="case-number mb-2 text-center">New entry</div>
      <h1 className="font-display text-center text-2xl sm:text-3xl" style={{ color: "var(--color-navy)" }}>
        Join the register
      </h1>
      <p className="mb-6 mt-1 text-center text-sm" style={{ color: "var(--color-ink-muted)" }}>
        Create and sign verified petitions.
      </p>

      <form onSubmit={handleSubmit} className="card-file flex flex-col gap-4 p-5 sm:p-6">
        <div>
          <label htmlFor="fullName" className="label-official">Full name</label>
          <input
            id="fullName"
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
            className="input-official"
          />
        </div>

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
          <label htmlFor="password" className="label-official">Password · min 6 chars</label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
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

        <button type="submit" disabled={loading} className="btn-official btn-brass" style={{ padding: "12px", opacity: loading ? 0.6 : 1 }}>
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: "var(--color-ink-muted)" }}>
        Already have an account?{" "}
        <a href="/login" style={{ color: "var(--color-navy)", fontWeight: 600, textDecoration: "underline" }}>
          Log in
        </a>
      </p>
    </main>
  );
}
