"use client";

import { useEffect } from "react";
import type { PublicWorkspaceAction } from "@/context/WorkspaceProvider";

/**
 * Ctrl/Cmd+Z reverts the last change. Because the undo stack itself
 * (state.history.past) is regular synced document state — it's pushed
 * to on every undoable action just like any other field — the UNDO
 * action needs no special-case wire format. It's dispatched exactly
 * like UPDATE_AMOUNT or ADD_PREPAYMENT, gets replicated the same way,
 * and every tab pops the same (already-synced) stack independently.
 */
export function useUndoShortcut(dispatch: (action: PublicWorkspaceAction) => void, canUndo: boolean): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isUndoCombo = (event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z";
      if (!isUndoCombo) return;
      event.preventDefault();
      if (canUndo) dispatch({ type: "UNDO" });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, canUndo]);
}
