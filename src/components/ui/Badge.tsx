import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "positive";
}) {
  // Solid fills for "accent" (LEADER) and "positive" (BEST VALUE), matching
  // the reference's filled pill treatment. "neutral" (a plain tab label)
  // stays a quiet outlined pill so it doesn't compete with those two.
  const toneClasses = {
    neutral: "bg-raised text-muted border-line",
    accent: "border-transparent bg-accent text-white",
    positive: "border-transparent bg-positive text-white",
  }[tone];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${toneClasses}`}
    >
      {children}
    </span>
  );
}
