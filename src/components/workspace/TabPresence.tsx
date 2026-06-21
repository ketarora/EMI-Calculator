import { Badge } from "@/components/ui/Badge";
import { shortTabLabel } from "@/lib/sync/ids";
import type { PresenceSnapshot } from "@/types/presence";

export function TabPresence({ presence }: { presence: PresenceSnapshot }) {
  const label = presence.tabId ? shortTabLabel(presence.tabId) : "Connecting…";

  return (
    <div className="flex items-center gap-2">
      <Badge tone={presence.isLeader ? "accent" : "neutral"}>
        {label}
        {presence.isLeader && " · Leader"}
      </Badge>
      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-positive" />
        </span>
        {presence.activeTabCount} tab{presence.activeTabCount === 1 ? "" : "s"} open
      </span>
    </div>
  );
}
