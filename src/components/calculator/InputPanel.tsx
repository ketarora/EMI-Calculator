"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SliderField } from "./SliderField";
import { LIMITS, type CalculatorInputs } from "@/types/state";
import { formatINRCompact } from "@/lib/finance/format";

interface InputPanelProps {
  inputs: CalculatorInputs;
  onChange: (field: "amount" | "rate" | "tenure", value: number) => void;
  onReset: () => void;
}

export function InputPanel({ inputs, onChange, onReset }: InputPanelProps) {
  return (
    <Card>
      <CardHeader
        title="Loan details"
        subtitle="Adjust and watch every open tab update."
        action={
          <Button size="sm" variant="ghost" onClick={onReset}>
            Reset
          </Button>
        }
      />
      <div className="space-y-6">
        <SliderField
          id="loan-amount"
          label="Loan amount"
          unitPrefix="₹"
          value={inputs.amount}
          min={LIMITS.amount.min}
          max={LIMITS.amount.max}
          step={LIMITS.amount.step}
          minLabel={formatINRCompact(LIMITS.amount.min)}
          maxLabel={formatINRCompact(LIMITS.amount.max)}
          onChange={(value) => onChange("amount", value)}
        />
        <SliderField
          id="interest-rate"
          label="Annual interest rate"
          unitSuffix="%"
          value={inputs.rate}
          min={LIMITS.rate.min}
          max={LIMITS.rate.max}
          step={LIMITS.rate.step}
          minLabel={`${LIMITS.rate.min}%`}
          maxLabel={`${LIMITS.rate.max}%`}
          onChange={(value) => onChange("rate", value)}
        />
        <SliderField
          id="tenure"
          label="Tenure"
          unitSuffix="mo"
          value={inputs.tenure}
          min={LIMITS.tenure.min}
          max={LIMITS.tenure.max}
          step={LIMITS.tenure.step}
          minLabel={`${LIMITS.tenure.min} mo`}
          maxLabel={`${LIMITS.tenure.max} mo`}
          onChange={(value) => onChange("tenure", value)}
        />
      </div>
    </Card>
  );
}
