"use client";

import { useEffect } from "react";
import type { ThemeMode } from "@/types/state";

/** The single point of contact between synced state and the DOM attribute
 *  Tailwind's dark-mode selector and globals.css both key off. */
export function ThemeEffect({ theme }: { theme: ThemeMode }) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return null;
}
