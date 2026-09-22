"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { signOut, getCurrentProfile } from "../lib/auth";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

  const linkStyle = { color: "#C7CDD6", padding: "8px 10px", fontSize: 12 } as const;

  return (
    <header className="sticky top-0 z-50">
      <div
        style={{ backgroundColor: "var(--color-navbar)" }}
        className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
      >
        <a href="/" className="flex min-w-0 items-center gap-3">
          <span
            style={{
              width: 32,
              height: 32,
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
          <span className="min-w-0">
            <span
              className="font-display block truncate"
              style={{ color: "#F1F3F1", fontSize: 18, letterSpacing: "0.02em", lineHeight: 1.1 }}
            >
              Petition Hub
            </span>
            <span
              className="font-mono-tight hidden sm:block"
              style={{ color: "var(--color-brass)", fontSize: 10, letterSpacing: "0.14em" }}
            >
              PUBLIC REGISTER · VERIFIED
            </span>
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {user ? (
            <>
              <a href="/" className="btn-official" style={linkStyle}>
                Petitions
              </a>
              <a href="/dashboard" className="btn-official" style={linkStyle}>
                Dashboard
              </a>
              {isAdmin && (
                <a href="/admin" className="btn-official" style={linkStyle}>
                  Admin
                </a>
              )}
              <a
                href="/petitions/new"
                className="btn-official btn-brass ml-1"
                style={{ padding: "8px 16px" }}
              >
                ＋ File a petition
              </a>
              <span
                className="font-mono-tight ml-2 hidden max-w-44 truncate lg:inline"
                style={{ color: "#C7CDD6", fontSize: 12 }}
                title={user.email ?? ""}
              >
                {user.email}
              </span>
              <span className="ml-1">
                <ThemeToggle />
              </span>
              <button
                onClick={() => signOut()}
                className="btn-official ml-1"
                style={{
                  color: "#F1F3F1",
                  border: "1px solid var(--color-brass)",
                  padding: "8px 14px",
                  background: "transparent",
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <a href="/" className="btn-official" style={linkStyle}>
                Petitions
              </a>
              <ThemeToggle />
              <a
                href="/login"
                className="btn-official"
                style={{ color: "#F1F3F1", padding: "8px 12px" }}
              >
                Log in
              </a>
              <a
                href="/signup"
                className="btn-official btn-brass"
                style={{ padding: "8px 16px" }}
              >
                Sign up
              </a>
            </>
          )}
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          {user && (
            <a
              href="/petitions/new"
              className="btn-official btn-brass"
              style={{ padding: "8px 12px", fontSize: 11 }}
            >
              ＋ File
            </a>
          )}
          <ThemeToggle />
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            style={{
              color: "#F1F3F1",
              border: "1px solid var(--color-brass)",
              borderRadius: 8,
              width: 36,
              height: 36,
              fontSize: 17,
              background: "transparent",
              cursor: "pointer",
            }}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <nav
          className="flex flex-col gap-1 px-4 py-3 md:hidden"
          style={{ backgroundColor: "var(--color-navy-deep)", borderTop: "1px solid var(--color-brass)" }}
        >
          <a href="/" onClick={() => setMenuOpen(false)} className="btn-official" style={{ color: "#F1F3F1", padding: "10px 4px", textAlign: "left" }}>
            Petitions
          </a>
          {user ? (
            <>
              <a href="/dashboard" onClick={() => setMenuOpen(false)} className="btn-official" style={{ color: "#F1F3F1", padding: "10px 4px", textAlign: "left" }}>
                Dashboard
              </a>
              {isAdmin && (
                <a href="/admin" onClick={() => setMenuOpen(false)} className="btn-official" style={{ color: "#F1F3F1", padding: "10px 4px", textAlign: "left" }}>
                  Admin review
                </a>
              )}
              <span className="font-mono-tight truncate px-1 py-1" style={{ color: "#C7CDD6", fontSize: 12 }}>
                {user.email}
              </span>
              <button
                onClick={() => signOut()}
                className="btn-official"
                style={{ color: "#F1F3F1", border: "1px solid var(--color-brass)", padding: "10px", marginTop: 6, background: "transparent" }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <a href="/login" onClick={() => setMenuOpen(false)} className="btn-official" style={{ color: "#F1F3F1", padding: "10px 4px", textAlign: "left" }}>
                Log in
              </a>
              <a href="/signup" onClick={() => setMenuOpen(false)} className="btn-official btn-brass" style={{ padding: "10px", marginTop: 4, textAlign: "center" }}>
                Sign up
              </a>
            </>
          )}
        </nav>
      )}
      <div className="rule-double" />
    </header>
  );
}
