import { Card, CardHeader } from "@/components/ui/Card";
import { formatINR } from "@/lib/finance/format";
import type { SensitivityGrid as SensitivityGridData } from "@/lib/finance/sensitivity";

function tenureLabel(months: number): string {
  if (months % 12 === 0) return `${months / 12} yr`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return years > 0 ? `${years}yr ${rest}mo` : `${months} mo`;
}

export function SensitivityGrid({ grid }: { grid: SensitivityGridData }) {
  return (
    <Card>
      <CardHeader title="What-if sensitivity" subtitle="EMI across nearby rates and tenures — your current pick is highlighted." />
      <div className="ledger-scroll overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 bg-surface px-2 py-2 text-left text-xs font-medium text-muted">Tenure \ Rate</th>
              {grid.rates.map((rate) => (
                <th key={rate} className="px-2 py-2 text-right font-figures text-xs font-medium text-muted">
                  {rate}%
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row, rowIndex) => {
              const tenure = grid.tenures[rowIndex];
              return (
                <tr key={tenure} className="border-t border-line">
                  <td className="sticky left-0 bg-surface px-2 py-2 text-left text-xs font-medium text-muted">
                    {tenureLabel(tenure ?? 0)}
                  </td>
                  {row.map((cell) => (
                    <td
                      key={`${cell.rate}-${cell.tenure}`}
                      className={`px-2 py-2 text-right font-figures text-xs ${
                        cell.isCurrent
                          ? "rounded-sm bg-accent font-semibold text-white"
                          : "text-ink"
                      }`}
                    >
                      {formatINR(cell.emi)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
