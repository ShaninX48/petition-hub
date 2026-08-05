import type { PetitionStatus } from "../types/database.types";

const STAMP_CONFIG: Record<
  PetitionStatus,
  { label: string; colorVar: string; rotate: string }
> = {
  green: { label: "VERIFIED", colorVar: "var(--color-seal-green)", rotate: "-7deg" },
  red: { label: "NOT VERIFIED", colorVar: "var(--color-seal-red)", rotate: "-4deg" },
  pending: { label: "UNDER REVIEW", colorVar: "var(--color-ink-muted)", rotate: "-9deg" },
  closed: { label: "CLOSED", colorVar: "var(--color-ink-muted)", rotate: "-5deg" },
};

export default function StampBadge({
  status,
  size = "md",
}: {
  status: PetitionStatus;
  size?: "sm" | "md";
}) {
  const { label, colorVar, rotate } = STAMP_CONFIG[status];
  const dimension = size === "sm" ? 64 : 84;
  const fontSize = size === "sm" ? "8px" : "9.5px";

  return (
    <div
      aria-label={label}
      style={{
        width: dimension,
        height: dimension,
        borderRadius: "9999px",
        border: `2px solid ${colorVar}`,
        boxShadow: `inset 0 0 0 3px ${colorVar}22`,
        color: colorVar,
        transform: `rotate(${rotate})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        fontFamily: "var(--font-mono)",
        fontSize,
        fontWeight: 700,
        letterSpacing: "0.04em",
        lineHeight: 1.15,
        padding: "6px",
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {label}
    </div>
  );
}
