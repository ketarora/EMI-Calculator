"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatINR } from "@/lib/finance/format";
import { validatePrepaymentInput } from "@/lib/finance/prepayment";
import type { PrepaymentEntry } from "@/types/state";
import type { PrepaymentImpact } from "@/lib/finance/prepayment";

export function PrepaymentPlanner({
  entries,
  currentTenure,
  impact,
  onAdd,
  onRemove,
  onClear,
}: {
  entries: PrepaymentEntry[];
  currentTenure: number;
  impact: PrepaymentImpact;
  onAdd: (month: number, amount: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  const [month, setMonth] = useState("12");
  const [amount, setAmount] = useState("100000");
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    const monthValue = Number(month);
    const amountValue = Number(amount);
    const validationError = validatePrepaymentInput(monthValue, amountValue, currentTenure);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onAdd(Math.round(monthValue), amountValue);
  }

  return (
    <Card>
      <CardHeader title="Prepayment planner" subtitle="Schedule lump-sum payments and see the interest saved." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="rounded-md border border-line bg-raised p-4">
            <div className="mb-3 text-sm font-medium text-ink">Add a one-time prepayment</div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs text-muted">
                Month
                <input
                  type="number"
                  min={1}
                  max={currentTenure}
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  className="w-24 rounded-sm border border-line bg-surface px-2 py-1.5 font-figures text-sm text-ink outline-none focus-visible:border-accent"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                Amount (₹)
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="w-32 rounded-sm border border-line bg-surface px-2 py-1.5 font-figures text-sm text-ink outline-none focus-visible:border-accent"
                />
              </label>
              <Button variant="primary" onClick={handleAdd}>
                Add
              </Button>
            </div>
            {error && <p className="mt-2 text-xs text-danger">{error}</p>}
          </div>

          <div className="mt-4 space-y-2">
            {entries.length === 0 ? (
              <p className="rounded-md border border-dashed border-line p-4 text-center text-xs text-muted">
                No prepayments yet. Add one above to see the impact.
              </p>
            ) : (
              <>
                {entries
                  .slice()
                  .sort((a, b) => a.month - b.month)
                  .map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-sm border border-line bg-surface px-3 py-2 text-sm"
                    >
                      <span className="text-muted">
                        Month <span className="font-figures font-medium text-ink">{entry.month}</span>
                      </span>
                      <span className="font-figures font-medium text-ink">{formatINR(entry.amount)}</span>
                      <button
                        onClick={() => onRemove(entry.id)}
                        className="text-xs text-danger hover:underline"
                        aria-label={`Remove prepayment in month ${entry.month}`}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                <button onClick={onClear} className="mt-1 text-xs text-muted hover:text-danger hover:underline">
                  Clear all prepayments
                </button>
              </>
            )}
          </div>
        </div>

        <div className="rounded-md border border-line bg-raised p-4">
          <div className="mb-3 text-sm font-medium text-ink">Prepayment impact</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Interest saved</span>
              <span className="font-figures text-lg font-semibold text-positive">{formatINR(impact.interestSaved)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Tenure reduced by</span>
              <span className="font-figures text-lg font-semibold text-positive">
                {impact.tenureReducedBy > 0 ? `${impact.tenureReducedBy} mo` : "—"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm">
              <div>
                <div className="text-xs text-muted">Original tenure</div>
                <div className="font-figures font-medium text-ink">{impact.originalTenure} mo</div>
              </div>
              <div>
                <div className="text-xs text-muted">New tenure</div>
                <div className="font-figures font-medium text-ink">{impact.newTenure} mo</div>
              </div>
              <div>
                <div className="text-xs text-muted">Original interest</div>
                <div className="font-figures font-medium text-ink">{formatINR(impact.originalInterest)}</div>
              </div>
              <div>
                <div className="text-xs text-muted">New interest</div>
                <div className="font-figures font-medium text-ink">{formatINR(impact.newInterest)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
