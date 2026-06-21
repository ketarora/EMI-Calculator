import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "positive";
}) {
  const toneClasses = {
    neutral: "bg-raised text-muted border-line",
    accent: "bg-accent/10 text-accent-strong border-accent/30",
    positive: "bg-positive/10 text-positive border-positive/30",
  }[tone];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${toneClasses}`}
    >
      {children}
    </span>
  );
}
