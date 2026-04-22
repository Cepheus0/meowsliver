import { desc } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { buildDashboardMetricPacket } from "@/lib/metrics/dashboard";
import { dbTransactionToUiTransaction } from "@/lib/server/import-db";
import { listAccounts } from "@/lib/server/accounts";
import { getSavingsGoalsPortfolio } from "@/lib/server/savings-goals";

export async function getDashboardMetricPacket(year: number) {
  const [transactionRows, accounts, goalsPortfolio] = await Promise.all([
    db
      .select()
      .from(transactions)
      .orderBy(
        desc(transactions.transactionDate),
        desc(transactions.transactionTime),
        desc(transactions.id)
      ),
    listAccounts(),
    getSavingsGoalsPortfolio(),
  ]);

  return buildDashboardMetricPacket({
    year,
    transactions: transactionRows.map(dbTransactionToUiTransaction),
    accounts,
    goalsPortfolio,
  });
}

