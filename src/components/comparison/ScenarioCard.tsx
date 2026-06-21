"use client";

import { SliderField } from "@/components/calculator/SliderField";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LIMITS } from "@/types/state";
import { formatINR, formatINRCompact } from "@/lib/finance/format";
import type { ScenarioResult } from "@/lib/finance/comparison";

export function ScenarioCard({
  scenario,
  onFieldChange,
  onRemove,
  canRemove,
}: {
  scenario: ScenarioResult;
  onFieldChange: (field: "amount" | "rate" | "tenure", value: number) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div
      className={`relative rounded-lg border p-5 transition-colors ${
        scenario.isBest ? "border-positive bg-positive/5" : "border-line bg-surface"
      }`}
    >
      {scenario.isBest && (
        <div className="absolute -top-3 left-5">
          <Badge tone="positive">Best value</Badge>
        </div>
      )}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-ink">{scenario.label}</h3>
        {canRemove && (
          <Button size="sm" variant="ghost" onClick={onRemove} aria-label={`Remove ${scenario.label}`}>
            Remove
          </Button>
        )}
      </div>

      <div className="space-y-5">
        <SliderField
          id={`${scenario.id}-amount`}
          label="Amount"
          unitPrefix="₹"
          value={scenario.amount}
          min={LIMITS.amount.min}
          max={LIMITS.amount.max}
          step={LIMITS.amount.step}
          minLabel={formatINRCompact(LIMITS.amount.min)}
          maxLabel={formatINRCompact(LIMITS.amount.max)}
          onChange={(value) => onFieldChange("amount", value)}
        />
        <SliderField
          id={`${scenario.id}-rate`}
          label="Rate"
          unitSuffix="%"
          value={scenario.rate}
          min={LIMITS.rate.min}
          max={LIMITS.rate.max}
          step={LIMITS.rate.step}
          minLabel={`${LIMITS.rate.min}%`}
          maxLabel={`${LIMITS.rate.max}%`}
          onChange={(value) => onFieldChange("rate", value)}
        />
        <SliderField
          id={`${scenario.id}-tenure`}
          label="Tenure"
          unitSuffix="mo"
          value={scenario.tenure}
          min={LIMITS.tenure.min}
          max={LIMITS.tenure.max}
          step={LIMITS.tenure.step}
          minLabel={`${LIMITS.tenure.min} mo`}
          maxLabel={`${LIMITS.tenure.max} mo`}
          onChange={(value) => onFieldChange("tenure", value)}
        />
      </div>

      <dl className="mt-5 space-y-1.5 border-t border-line pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Monthly EMI</dt>
          <dd className="font-figures font-semibold text-ink">{formatINR(scenario.emi)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Total interest</dt>
          <dd className="font-figures text-interest">{formatINR(scenario.totalInterest)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Total payable</dt>
          <dd className={`font-figures font-semibold ${scenario.isBest ? "text-positive" : "text-ink"}`}>
            {formatINR(scenario.totalPayable)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
