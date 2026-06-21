"use client";

import { useState } from "react";
import { formatINR } from "@/lib/finance/format";
import type { AmortizationRow } from "@/lib/finance/amortization";
import { Button } from "@/components/ui/Button";

const ROWS_PER_PAGE = 12;

export function ScheduleTable({ rows, breakEvenMonth }: { rows: AmortizationRow[]; breakEvenMonth: number | null }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(Math.ceil(rows.length / ROWS_PER_PAGE), 1);
  const clampedPage = Math.min(page, pageCount - 1);
  const start = clampedPage * ROWS_PER_PAGE;
  const visibleRows = rows.slice(start, start + ROWS_PER_PAGE);

  return (
    <div>
      <div className="ledger-scroll overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs font-medium text-muted">
              <th className="px-2 py-2">Month</th>
              <th className="px-2 py-2 text-right">EMI</th>
              <th className="px-2 py-2 text-right">Principal</th>
              <th className="px-2 py-2 text-right">Interest</th>
              <th className="px-2 py-2 text-right">Prepayment</th>
              <th className="px-2 py-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const isBreakEven = row.month === breakEvenMonth;
              return (
                <tr
                  key={row.month}
                  className={`border-t border-line ${isBreakEven ? "bg-accent/10" : ""}`}
                >
                  <td className="px-2 py-2 font-figures text-xs">
                    {row.month}
                    {isBreakEven && (
                      <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                        Break-even
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right font-figures text-xs text-ink">{formatINR(row.emi)}</td>
                  <td className="px-2 py-2 text-right font-figures text-xs text-principal">{formatINR(row.principalPaid)}</td>
                  <td className="px-2 py-2 text-right font-figures text-xs text-interest">{formatINR(row.interestPaid)}</td>
                  <td className="px-2 py-2 text-right font-figures text-xs text-muted">
                    {row.prepayment > 0 ? formatINR(row.prepayment) : "—"}
                  </td>
                  <td className="px-2 py-2 text-right font-figures text-xs text-ink">{formatINR(row.balance)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>
          Showing {start + 1}–{Math.min(start + ROWS_PER_PAGE, rows.length)} of {rows.length} months
          {breakEvenMonth && (
            <>
              {" "}
              · Break-even at month <span className="font-figures font-semibold text-accent-strong">{breakEvenMonth}</span>
            </>
          )}
        </span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" disabled={clampedPage === 0} onClick={() => setPage((p) => Math.max(p - 1, 0))}>
            Prev
          </Button>
          <span className="font-figures">
            {clampedPage + 1} / {pageCount}
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={clampedPage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(p + 1, pageCount - 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
