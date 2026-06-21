"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScenarioCard } from "./ScenarioCard";
import { compareScenarios } from "@/lib/finance/comparison";
import { MAX_SCENARIOS, type Scenario } from "@/types/state";

export function ComparisonMode({
  scenarios,
  onAdd,
  onRemove,
  onFieldChange,
}: {
  scenarios: Scenario[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onFieldChange: (id: string, field: "amount" | "rate" | "tenure", value: number) => void;
}) {
  const results = compareScenarios(scenarios);

  return (
    <Card>
      <CardHeader
        title="Compare scenarios"
        subtitle={`Configure up to ${MAX_SCENARIOS} scenarios — the lowest total cost is highlighted.`}
        action={
          <Button size="sm" variant="primary" onClick={onAdd} disabled={scenarios.length >= MAX_SCENARIOS}>
            + Add scenario
          </Button>
        }
      />

      {results.length === 0 ? (
        <div className="rounded-md border border-dashed border-line p-8 text-center text-sm text-muted">
          No scenarios yet. Add one to start comparing loan options side by side.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {results.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              canRemove={scenarios.length > 1}
              onRemove={() => onRemove(scenario.id)}
              onFieldChange={(field, value) => onFieldChange(scenario.id, field, value)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
