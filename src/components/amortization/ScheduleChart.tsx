"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AmortizationRow } from "@/lib/finance/amortization";
import { formatINR, formatINRCompact } from "@/lib/finance/format";

interface TooltipPayloadItem {
  dataKey: string;
  value: number;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: number }) {
  if (!active || !payload || payload.length === 0) return null;
  const principal = payload.find((p) => p.dataKey === "principalPaid")?.value ?? 0;
  const interest = payload.find((p) => p.dataKey === "interestPaid")?.value ?? 0;
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-raised">
      <div className="mb-1 font-medium text-ink">Month {label}</div>
      <div className="flex items-center gap-1.5 text-principal">
        <span className="h-2 w-2 rounded-full bg-principal" /> Principal {formatINR(principal)}
      </div>
      <div className="flex items-center gap-1.5 text-interest">
        <span className="h-2 w-2 rounded-full bg-interest" /> Interest {formatINR(interest)}
      </div>
    </div>
  );
}

export function ScheduleChart({ rows }: { rows: AmortizationRow[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={1}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--c-border))" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "rgb(var(--c-muted))" }}
            tickLine={false}
            axisLine={{ stroke: "rgb(var(--c-border))" }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v: number) => formatINRCompact(v)}
            tick={{ fontSize: 11, fill: "rgb(var(--c-muted))" }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgb(var(--c-border) / 0.4)" }} />
          <Bar dataKey="principalPaid" stackId="emi" fill="rgb(var(--c-principal))" radius={[0, 0, 0, 0]} />
          <Bar dataKey="interestPaid" stackId="emi" fill="rgb(var(--c-interest))" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
