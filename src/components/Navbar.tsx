"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { signOut, getCurrentProfile } from "../lib/auth";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    getCurrentProfile().then((profile) => setIsAdmin(profile?.role === "admin"));

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      const profile = await getCurrentProfile();
      setIsAdmin(profile?.role === "admin");
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
            <a
              href="/dashboard"
              className="btn-official hidden sm:inline"
              style={{ color: "#F1F3F1", padding: "6px 4px" }}
            >
              Dashboard
            </a>
            {isAdmin && (
              <a
                href="/admin"
                className="btn-official hidden sm:inline"
                style={{ color: "#F1F3F1", padding: "6px 4px" }}
              >
                Admin
              </a>
            )}
            <a
              href="/petitions/new"
              className="btn-official"
              style={{
                color: "var(--color-navy-deep)",
                background: "var(--color-brass)",
                padding: "6px 14px",
              }}
            >
              File a petition
            </a>
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
