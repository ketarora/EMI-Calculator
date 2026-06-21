"use client";

import { useEffect, useRef, useState } from "react";
import { clamp } from "@/lib/finance/format";

interface SliderFieldProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unitPrefix?: string;
  unitSuffix?: string;
  minLabel: string;
  maxLabel: string;
  onChange: (value: number) => void;
}

/**
 * The number input and the slider both represent the same value and stay
 * in sync instantly — but they handle "instant" differently on purpose:
 *
 *  - the slider has no notion of a "partial" value, so every drag tick
 *    commits straight through onChange.
 *  - the number input is allowed to hold a *draft* string that doesn't
 *    parse to a valid value yet (e.g. the user has typed "1" on the way
 *    to "15000", or is mid-delete) — clamping that to the field's min on
 *    every keystroke would fight the user's typing. The draft commits on
 *    blur, on Enter, and on a short debounce so cross-tab sync still
 *    feels real-time without that jank.
 *  - if a remote tab changes the value while this input is focused, we
 *    don't yank the draft out from under the person typing — it simply
 *    adopts the latest value once they blur or commit themselves.
 */
export function SliderField({
  id,
  label,
  value,
  min,
  max,
  step,
  unitPrefix,
  unitSuffix,
  minLabel,
  maxLabel,
  onChange,
}: SliderFieldProps) {
  const [draft, setDraft] = useState(() => String(value));
  const isFocusedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isFocusedRef.current) setDraft(String(value));
  }, [value]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  function commit(raw: string) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) onChange(parsed);
  }

  function handleDraftChange(raw: string) {
    setDraft(raw);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commit(raw), 350);
  }

  const fillPct = ((clamp(value, min, max) - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        <div className="flex items-center gap-1 rounded-sm border border-line bg-raised px-2 py-1">
          {unitPrefix && <span className="font-figures text-sm text-muted">{unitPrefix}</span>}
          <input
            id={id}
            type="text"
            inputMode="decimal"
            value={draft}
            onFocus={() => {
              isFocusedRef.current = true;
            }}
            onBlur={() => {
              isFocusedRef.current = false;
              if (debounceRef.current) clearTimeout(debounceRef.current);
              commit(draft);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") (event.target as HTMLInputElement).blur();
            }}
            onChange={(event) => handleDraftChange(event.target.value)}
            className="w-24 bg-transparent text-right font-figures text-sm text-ink outline-none"
            aria-label={`${label} value`}
          />
          {unitSuffix && <span className="font-figures text-sm text-muted">{unitSuffix}</span>}
        </div>
      </div>

      <input
        type="range"
        className="ledger-range"
        style={{ "--fill": `${fillPct}%` } as React.CSSProperties}
        min={min}
        max={max}
        step={step}
        value={clamp(value, min, max)}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        aria-valuetext={`${unitPrefix ?? ""}${value}${unitSuffix ?? ""}`}
      />

      <div className="flex justify-between text-[11px] text-muted">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
