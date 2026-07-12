import { ReceiptText } from "lucide-react";
import type {
  CarbonTransaction,
  EmissionFactor,
} from "@/features/environment/types/environment";
import {
  formatCategory,
  formatDate,
  formatEmissions,
} from "@/features/environment/lib/format";

function EmptyTransactions() {
  return (
    <div className="flex min-h-52 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 text-center dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No carbon transactions for this period.
      </p>
    </div>
  );
}

export function RecentTransactions({
  factorById,
  transactions,
}: {
  factorById: Map<string, EmissionFactor>;
  transactions: CarbonTransaction[];
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            Recent Carbon Transactions
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Latest calculated activity records
          </p>
        </div>
        <span className="grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
          <ReceiptText size={19} />
        </span>
      </div>

      {transactions.length === 0 ? (
        <EmptyTransactions />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-slate-200 dark:border-white/10 lg:block">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Source</th>
                  <th className="px-4 py-3 font-semibold">Quantity</th>
                  <th className="px-4 py-3 font-semibold">Factor</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Emissions
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr
                    className="border-t border-slate-200 dark:border-white/10"
                    key={transaction.id}
                  >
                    <td className="px-4 py-4 text-slate-700 dark:text-slate-200">
                      {formatDate(transaction.transaction_date)}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-950 dark:text-white">
                        {transaction.factor_snapshot.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatCategory(transaction.source_type)}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-slate-700 dark:text-slate-200">
                      {transaction.quantity.toLocaleString()} {transaction.unit}
                    </td>
                    <td className="px-4 py-4 text-slate-700 dark:text-slate-200">
                      {transaction.factor_snapshot.factor}{" "}
                      <span className="text-slate-400">kg CO2e/unit</span>
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-slate-950 dark:text-white">
                      {formatEmissions(transaction.emission_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {transactions.map((transaction) => {
              const factor = factorById.get(transaction.emission_factor_id);

              return (
                <article
                  className="rounded-lg border border-slate-200 p-4 dark:border-white/10"
                  key={transaction.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                        {transaction.factor_snapshot.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(transaction.transaction_date)} ·{" "}
                        {formatCategory(transaction.source_type)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-slate-950 dark:text-white">
                      {formatEmissions(transaction.emission_value)}
                    </p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      {transaction.quantity.toLocaleString()} {transaction.unit}
                    </span>
                    <span className="text-right">
                      {factor?.status ?? "snapshot"} factor
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
