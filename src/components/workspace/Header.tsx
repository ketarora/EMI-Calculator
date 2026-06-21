"use client";

import { TabPresence } from "./TabPresence";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/Button";
import type { PresenceSnapshot } from "@/types/presence";
import type { ThemeMode } from "@/types/state";

export function Header({
  presence,
  theme,
  onThemeChange,
  canUndo,
  onUndo,
}: {
  presence: PresenceSnapshot;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  canUndo: boolean;
  onUndo: () => void;
}) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent font-display text-sm font-bold text-white">
            T
          </span>
          <div>
            <div className="font-display text-base font-semibold leading-tight text-ink">Tenure</div>
            <div className="text-[11px] leading-tight text-muted">Loan workspace, synced across tabs</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <TabPresence presence={presence} />
          <Button size="sm" variant="ghost" onClick={onUndo} disabled={!canUndo} title="Undo last change (Ctrl/Cmd+Z)">
            Undo
          </Button>
          <ThemeToggle theme={theme} onChange={onThemeChange} />
        </div>
      </div>
    </header>
  );
}
