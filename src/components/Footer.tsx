export default function Footer() {
  return (
    <footer className="mt-16">
      <div className="rule-double" />
      <div
        className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 py-10 text-center"
      >
        <div className="case-number">Petition Hub · Public Register</div>
        <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
          Verified civic petitions. Every submission is reviewed before it goes public.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <a href="/" className="btn-official" style={{ color: "var(--color-navy)", padding: "4px" }}>
            Petitions
          </a>
          <a href="/petitions/new" className="btn-official" style={{ color: "var(--color-navy)", padding: "4px" }}>
            File a petition
          </a>
          <a href="/dashboard" className="btn-official" style={{ color: "var(--color-navy)", padding: "4px" }}>
            Dashboard
          </a>
        </div>
        <p className="font-mono-tight" style={{ fontSize: 11, color: "var(--color-ink-muted)" }}>
          FILE · VERIFY · SIGN — {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
