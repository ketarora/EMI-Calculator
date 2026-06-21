/** crypto.randomUUID is available in every modern browser this app targets,
 *  but we fall back defensively rather than crash on an older WebView. */
export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Short, human-friendly tab label derived from a UUID, e.g. "Tab 4F2A". */
export function shortTabLabel(tabId: string): string {
  const compact = tabId.replace(/-/g, "").toUpperCase();
  return `Tab ${compact.slice(0, 4)}`;
}
