import Papa from "papaparse";
import type { AmortizationRow } from "@/lib/finance/amortization";
import { roundCurrency } from "@/lib/finance/format";

interface ExportMeta {
  amount: number;
  rate: number;
  tenure: number;
}

export function amortizationToCsv(rows: AmortizationRow[], meta: ExportMeta): string {
  const data = rows.map((row) => ({
    Month: row.month,
    EMI: roundCurrency(row.emi),
    "Principal Paid": roundCurrency(row.principalPaid),
    "Interest Paid": roundCurrency(row.interestPaid),
    Prepayment: roundCurrency(row.prepayment),
    "Balance Remaining": roundCurrency(row.balance),
  }));

  const header = `# Loan amount: ${meta.amount} | Rate: ${meta.rate}% p.a. | Tenure: ${meta.tenure} months\n`;
  return header + Papa.unparse(data);
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
