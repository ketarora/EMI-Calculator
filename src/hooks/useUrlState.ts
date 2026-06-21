"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LIMITS, type CalculatorInputs } from "@/types/state";
import { clamp } from "@/lib/finance/format";
import type { PublicWorkspaceAction } from "@/context/WorkspaceProvider";

/**
 * Bonus: "URL State Sharing". Opening the app with
 * `?amount=1500000&rate=11&tenure=48` in the address bar loads that
 * exact scenario, and the address bar keeps itself updated afterwards
 * so the current view is always a shareable link.
 *
 * Ordering matters here: we don't touch the URL until *after* we've
 * read it once, and we don't read it until the workspace is `ready`
 * (hydrated from a leader, or confirmed to be the only tab) — otherwise
 * a same-room hydration could race with, and silently overwrite, a
 * deliberately shared link.
 */
export function useUrlState(
  calculator: CalculatorInputs,
  dispatch: (action: PublicWorkspaceAction) => void,
  ready: boolean
): void {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const hasReadUrlRef = useRef(false);

  useEffect(() => {
    if (!ready || hasReadUrlRef.current) return;
    hasReadUrlRef.current = true;

    const amountParam = searchParams.get("amount");
    const rateParam = searchParams.get("rate");
    const tenureParam = searchParams.get("tenure");
    if (amountParam === null && rateParam === null && tenureParam === null) return;

    if (amountParam !== null) {
      const value = Number(amountParam);
      if (Number.isFinite(value)) {
        dispatch({ type: "UPDATE_AMOUNT", payload: clamp(value, LIMITS.amount.min, LIMITS.amount.max) });
      }
    }
    if (rateParam !== null) {
      const value = Number(rateParam);
      if (Number.isFinite(value)) {
        dispatch({ type: "UPDATE_RATE", payload: clamp(value, LIMITS.rate.min, LIMITS.rate.max) });
      }
    }
    if (tenureParam !== null) {
      const value = Number(tenureParam);
      if (Number.isFinite(value)) {
        dispatch({ type: "UPDATE_TENURE", payload: clamp(value, LIMITS.tenure.min, LIMITS.tenure.max) });
      }
    }
    // Intentionally only depends on `ready` — this block must run exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    if (!hasReadUrlRef.current) return;
    const params = new URLSearchParams();
    params.set("amount", String(Math.round(calculator.amount)));
    params.set("rate", String(calculator.rate));
    params.set("tenure", String(Math.round(calculator.tenure)));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [calculator.amount, calculator.rate, calculator.tenure, pathname, router]);
}
