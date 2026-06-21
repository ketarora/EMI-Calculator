"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ScheduleTable } from "./ScheduleTable";
import { ScheduleChart } from "./ScheduleChart";
import { amortizationToCsv, downloadCsv } from "@/lib/export/csv";
import type { AmortizationResult } from "@/lib/finance/amortization";

type ViewMode = "table" | "chart";

export function AmortizationSection({
  schedule,
  amount,
  rate,
  tenure,
  title = "Amortization schedule",
  subtitle = "Month-by-month principal and interest breakdown.",
}: {
  schedule: AmortizationResult;
  amount: number;
  rate: number;
  tenure: number;
  title?: string;
  subtitle?: string;
}) {
  const [view, setView] = useState<ViewMode>("table");

  function handleExport() {
    const csv = amortizationToCsv(schedule.rows, { amount, rate, tenure });
    downloadCsv(`amortization-schedule-${amount}-${rate}pct-${tenure}mo.csv`, csv);
  }

  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={subtitle}
        action={
          <div className="flex items-center gap-2">
            <SegmentedControl
              ariaLabel="Schedule view"
              value={view}
              onChange={setView}
              options={[
                { value: "table", label: "Table" },
                { value: "chart", label: "Chart" },
              ]}
            />
            <Button size="sm" variant="secondary" onClick={handleExport}>
              Export CSV
            </Button>
          </div>
        }
      />
      {view === "table" ? (
        <ScheduleTable rows={schedule.rows} breakEvenMonth={schedule.breakEvenMonth} />
      ) : (
        <ScheduleChart rows={schedule.rows} />
      )}
    </Card>
  );
}
