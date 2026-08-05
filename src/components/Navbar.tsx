"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { signOut } from "../lib/auth";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <header>
      <div
        style={{ backgroundColor: "var(--color-navbar)" }}
        className="flex items-center justify-between px-5 py-3"
      >
        <a href="/" className="flex items-center gap-3">
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: "9999px",
              border: "1.5px solid var(--color-brass)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: "9999px",
                border: "1px solid var(--color-brass)",
              }}
            />
          </span>
          <span
            className="font-display"
            style={{ color: "#F1F3F1", fontSize: 18, letterSpacing: "0.02em" }}
          >
            Petition Hub
          </span>
        </a>

        {user ? (
          <div className="flex items-center gap-4">
            <span
              className="font-mono-tight hidden sm:inline"
              style={{ color: "#C7CDD6", fontSize: 12 }}
            >
              {user.email}
            </span>
            <ThemeToggle />
            <button
              onClick={() => signOut()}
              className="btn-official"
              style={{
                color: "#F1F3F1",
                border: "1px solid var(--color-brass)",
                padding: "6px 14px",
                background: "transparent",
              }}
            >
              Log out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a
              href="/login"
              className="btn-official"
              style={{ color: "#F1F3F1", padding: "6px 10px" }}
            >
              Log in
            </a>
            <a
              href="/signup"
              className="btn-official"
              style={{
                color: "var(--color-navy-deep)",
                background: "var(--color-brass)",
                padding: "6px 14px",
              }}
            >
              Sign up
            </a>
          </div>
        )}
      </div>
      <div className="rule-double" />
    </header>
  );
}
