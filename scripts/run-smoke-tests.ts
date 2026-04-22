import { inArray, sql } from "drizzle-orm";
import { db } from "../src/db";
import {
  accounts,
  importRunRows,
  importRuns,
  savingsGoalEntries,
  savingsGoals,
  transactions,
} from "../src/db/schema";

const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const smokeTag = `SMOKE_${Date.now()}`;
const createdImportRunIds: number[] = [];
const createdAccountIds: number[] = [];
let createdGoalId: number | null = null;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(
  path: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(`${appUrl}${path}`, init);
}

async function expectOk(path: string, contentType?: string) {
  const response = await request(path);
  assert(response.ok, `Expected ${path} to return 2xx, received ${response.status}`);

  if (contentType) {
    assert(
      response.headers.get("content-type")?.includes(contentType),
      `Expected ${path} to include content-type ${contentType}`
    );
  }
}

async function cleanup() {
  if (createdImportRunIds.length > 0) {
    await db
      .delete(transactions)
      .where(inArray(transactions.importRunId, createdImportRunIds));
    await db
      .delete(importRunRows)
      .where(inArray(importRunRows.importRunId, createdImportRunIds));
    await db.delete(importRuns).where(inArray(importRuns.id, createdImportRunIds));
  }

  if (createdGoalId) {
    await db
      .delete(savingsGoalEntries)
      .where(inArray(savingsGoalEntries.savingsGoalId, [createdGoalId]));
    await db.delete(savingsGoals).where(inArray(savingsGoals.id, [createdGoalId]));
  }

  await db.delete(transactions).where(sql`${transactions.note} like ${`${smokeTag}%`}`);

  if (createdAccountIds.length > 0) {
    await db
      .delete(transactions)
      .where(inArray(transactions.accountId, createdAccountIds));
    await db.delete(accounts).where(inArray(accounts.id, createdAccountIds));
  }
}

async function main() {
  console.log(`Smoke test target: ${appUrl}`);

  try {
    for (const path of [
      "/",
      "/import",
      "/transactions",
      "/buckets",
      "/reports",
      "/investments",
    ]) {
      await expectOk(path, "text/html");
      console.log(`PASS page ${path}`);
    }

    await expectOk("/api/transactions", "application/json");
    console.log("PASS api /api/transactions");
    await expectOk("/api/accounts", "application/json");
    console.log("PASS api /api/accounts");
    await expectOk("/api/savings-goals", "application/json");
    console.log("PASS api /api/savings-goals");
    await expectOk("/api/metrics/dashboard", "application/json");
    const dashboardMetricsResponse = await request("/api/metrics/dashboard?year=2030");
    const dashboardMetricsJson = (await dashboardMetricsResponse.json()) as {
      packet?: {
        scope?: string;
        period?: string;
        metrics?: {
          summary?: {
            year?: number;
          };
        };
      };
    };
    assert(
      dashboardMetricsJson.packet?.scope === "dashboard",
      "Expected dashboard metrics endpoint to return a dashboard packet"
    );
    assert(
      dashboardMetricsJson.packet?.period === "2030" &&
        dashboardMetricsJson.packet.metrics?.summary?.year === 2030,
      "Expected dashboard metrics endpoint to honor the year query"
    );
    console.log("PASS api /api/metrics/dashboard");

    await expectOk(
      "/api/metrics/anomalies/today?date=2030-03-02",
      "application/json"
    );
    console.log("PASS api /api/metrics/anomalies/today");
    await expectOk(
      "/api/metrics/transactions/day?date=2030-03-02",
      "application/json"
    );
    console.log("PASS api /api/metrics/transactions/day");
    await expectOk(
      "/api/metrics/transactions/compare?from=2030-03&to=2030-02",
      "application/json"
    );
    console.log("PASS api /api/metrics/transactions/compare");
    await expectOk("/api/metrics/accounts/health", "application/json");
    console.log("PASS api /api/metrics/accounts/health");
    await expectOk("/api/metrics/goals/overview", "application/json");
    console.log("PASS api /api/metrics/goals/overview");
    await expectOk("/api/metrics/imports/recent", "application/json");
    console.log("PASS api /api/metrics/imports/recent");
    await expectOk(
      "/api/insights/dashboard?date=2030-03-02",
      "application/json"
    );
    console.log("PASS api /api/insights/dashboard");

    const accountsResponse = await request("/api/accounts");
    const accountsJson = (await accountsResponse.json()) as {
      accounts: Array<{ id: number; currentBalance: number; isArchived: boolean }>;
    };
    const targetAccount =
      accountsJson.accounts.find((account) => !account.isArchived) ?? null;
    const startingBalance = targetAccount?.currentBalance ?? null;

    const manualCreateResponse = await request("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: "2030-03-01",
        amount: 321,
        type: "expense",
        category: "อาหาร/เครื่องดื่ม",
        note: `${smokeTag} manual create`,
        accountId: targetAccount?.id ?? null,
      }),
    });
    assert(
      manualCreateResponse.status === 201,
      `Expected manual transaction create to return 201, received ${manualCreateResponse.status}`
    );
    const manualCreateJson = (await manualCreateResponse.json()) as {
      transaction?: {
        id: string;
        source?: string;
      };
    };
    assert(manualCreateJson.transaction, "Expected manual transaction response to return the created row");
    assert(
      manualCreateJson.transaction.source === "manual",
      "Expected manual transaction source to be marked as manual"
    );
    console.log("PASS manual transaction create");

    if (targetAccount && startingBalance != null) {
      const updatedAccountsResponse = await request("/api/accounts");
      const updatedAccountsJson = (await updatedAccountsResponse.json()) as {
        accounts: Array<{ id: number; currentBalance: number }>;
      };
      const updatedTarget = updatedAccountsJson.accounts.find(
        (account) => account.id === targetAccount.id
      );
      assert(updatedTarget, "Expected target account to remain available after create");
      assert(
        updatedTarget.currentBalance === startingBalance - 321,
        "Expected manual expense create to reduce the linked account balance"
      );
      console.log("PASS manual transaction account balance create");
    }

    const manualUpdateResponse = await request(
      `/api/transactions/${manualCreateJson.transaction.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "2030-03-02",
          amount: 500,
          type: "income",
          category: "เงินเดือน",
          note: `${smokeTag} manual updated`,
          accountId: targetAccount?.id ?? null,
        }),
      }
    );
    assert(
      manualUpdateResponse.ok,
      `Expected manual transaction update to pass, received ${manualUpdateResponse.status}`
    );
    const manualUpdateJson = (await manualUpdateResponse.json()) as {
      transaction?: {
        category: string;
        note?: string;
      };
    };
    assert(
      manualUpdateJson.transaction?.category === "เงินเดือน" &&
        manualUpdateJson.transaction.note === `${smokeTag} manual updated`,
      "Expected manual update to return the edited values"
    );
    console.log("PASS manual transaction update");

    if (targetAccount && startingBalance != null) {
      const updatedAccountsResponse = await request("/api/accounts");
      const updatedAccountsJson = (await updatedAccountsResponse.json()) as {
        accounts: Array<{ id: number; currentBalance: number }>;
      };
      const updatedTarget = updatedAccountsJson.accounts.find(
        (account) => account.id === targetAccount.id
      );
      assert(updatedTarget, "Expected target account to remain available after update");
      assert(
        updatedTarget.currentBalance === startingBalance + 500,
        "Expected manual update to recalculate the linked account balance"
      );
      console.log("PASS manual transaction account balance update");
    }

    const transactionsAfterUpdateResponse = await request("/api/transactions");
    const transactionsAfterUpdateJson = (await transactionsAfterUpdateResponse.json()) as {
      transactions: Array<{ id: string; note?: string }>;
    };
    assert(
      transactionsAfterUpdateJson.transactions.some(
        (transaction) => transaction.note === `${smokeTag} manual updated`
      ),
      "Expected updated manual transaction to appear in the transactions feed"
    );
    console.log("PASS manual transaction list hydration");

    const manualDeleteResponse = await request(
      `/api/transactions/${manualCreateJson.transaction.id}`,
      {
        method: "DELETE",
      }
    );
    assert(
      manualDeleteResponse.ok,
      `Expected manual transaction delete to pass, received ${manualDeleteResponse.status}`
    );
    console.log("PASS manual transaction delete");

    if (targetAccount && startingBalance != null) {
      const updatedAccountsResponse = await request("/api/accounts");
      const updatedAccountsJson = (await updatedAccountsResponse.json()) as {
        accounts: Array<{ id: number; currentBalance: number }>;
      };
      const updatedTarget = updatedAccountsJson.accounts.find(
        (account) => account.id === targetAccount.id
      );
      assert(updatedTarget, "Expected target account to remain available after delete");
      assert(
        updatedTarget.currentBalance === startingBalance,
        "Expected manual delete to restore the linked account balance"
      );
      console.log("PASS manual transaction account balance delete");
    }

    const reconcileAccountResponse = await request("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${smokeTag} reconcile account`,
        type: "cash",
        initialBalance: 1000,
      }),
    });
    assert(
      reconcileAccountResponse.status === 201,
      `Expected reconcile test account create to return 201, received ${reconcileAccountResponse.status}`
    );
    const reconcileAccountJson = (await reconcileAccountResponse.json()) as {
      account?: { id: number; currentBalance: number };
    };
    assert(
      reconcileAccountJson.account,
      "Expected reconcile test account create to return the new account"
    );
    createdAccountIds.push(reconcileAccountJson.account.id);
    console.log("PASS account create for reconciliation");

    const reconcileWithoutTransactionsResponse = await request(
      `/api/accounts/${reconcileAccountJson.account.id}/reconcile`,
      {
        method: "POST",
      }
    );
    assert(
      reconcileWithoutTransactionsResponse.status === 400,
      `Expected reconcile without linked transactions to return 400, received ${reconcileWithoutTransactionsResponse.status}`
    );
    console.log("PASS account reconcile guard without linked transactions");

    const reconcileTransactionResponse = await request("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: "2030-03-05",
        amount: 200,
        type: "expense",
        category: "อาหาร/เครื่องดื่ม",
        note: `${smokeTag} reconcile drift`,
        accountId: reconcileAccountJson.account.id,
      }),
    });
    assert(
      reconcileTransactionResponse.status === 201,
      `Expected reconcile drift transaction create to return 201, received ${reconcileTransactionResponse.status}`
    );
    console.log("PASS account reconcile drift seed transaction");

    const reconcileDetailResponse = await request(
      `/api/accounts/${reconcileAccountJson.account.id}`
    );
    assert(
      reconcileDetailResponse.ok,
      `Expected reconcile detail fetch to pass, received ${reconcileDetailResponse.status}`
    );
    const reconcileDetailJson = (await reconcileDetailResponse.json()) as {
      account: { currentBalance: number };
      reconciliation: {
        status: string;
        balanceDifference: number;
        transactionDerivedBalance: number;
        linkedExpense: number;
        linkedTransactionCount: number;
        canReconcile: boolean;
      };
    };
    assert(
      reconcileDetailJson.account.currentBalance === 800,
      "Expected seeded reconcile account to reflect the original balance plus manual delta before reconciliation"
    );
    assert(
      reconcileDetailJson.reconciliation.status === "needs_attention" &&
        reconcileDetailJson.reconciliation.balanceDifference === 1000 &&
        reconcileDetailJson.reconciliation.transactionDerivedBalance === -200 &&
        reconcileDetailJson.reconciliation.linkedExpense === 200 &&
        reconcileDetailJson.reconciliation.linkedTransactionCount === 1 &&
        reconcileDetailJson.reconciliation.canReconcile,
      "Expected account detail reconciliation summary to explain stored-vs-ledger drift"
    );
    console.log("PASS account reconciliation detail explainability");

    const reconcileCommitResponse = await request(
      `/api/accounts/${reconcileAccountJson.account.id}/reconcile`,
      {
        method: "POST",
      }
    );
    assert(
      reconcileCommitResponse.ok,
      `Expected reconcile commit to pass, received ${reconcileCommitResponse.status}`
    );
    const reconcileCommitJson = (await reconcileCommitResponse.json()) as {
      detail?: {
        account: { currentBalance: number };
        reconciliation: {
          status: string;
          balanceDifference: number;
          storedBalance: number;
          transactionDerivedBalance: number;
        };
      };
    };
    assert(
      reconcileCommitJson.detail?.account.currentBalance === -200 &&
        reconcileCommitJson.detail.reconciliation.status === "aligned" &&
        reconcileCommitJson.detail.reconciliation.balanceDifference === 0 &&
        reconcileCommitJson.detail.reconciliation.storedBalance === -200 &&
        reconcileCommitJson.detail.reconciliation.transactionDerivedBalance === -200,
      "Expected reconcile action to persist the transaction-derived balance and clear the drift"
    );
    console.log("PASS account reconciliation action");

    const createResponse = await request("/api/savings-goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${smokeTag} retirement`,
        category: "retirement",
        targetAmount: 300000,
        targetDate: "2030-12-31",
        initialAmount: 50000,
        initialDate: "2030-01-01",
        strategyLabel: "RMF",
        notes: smokeTag,
      }),
    });
    assert(
      createResponse.status === 201,
      `Expected create savings goal to return 201, received ${createResponse.status}`
    );
    const createJson = (await createResponse.json()) as {
      detail?: {
        goal: { id: number; name: string };
        metrics: { currentAmount: number };
      };
    };
    assert(createJson.detail, "Expected create savings goal to return detail");
    createdGoalId = createJson.detail.goal.id;
    assert(
      createJson.detail.metrics.currentAmount === 50000,
      "Expected created goal to include initial amount"
    );
    console.log(`PASS savings goal create (${createdGoalId})`);

    const patchResponse = await request(`/api/savings-goals/${createdGoalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${smokeTag} retirement updated`,
        category: "retirement",
        targetAmount: 320000,
        targetDate: "2031-12-31",
        strategyLabel: "RMF + bond fund",
        notes: `${smokeTag} patched`,
        icon: "🌅",
        color: "#f59e0b",
      }),
    });
    assert(
      patchResponse.ok,
      `Expected patch savings goal to pass, received ${patchResponse.status}`
    );
    console.log("PASS savings goal update");

    const entryResponse = await request(
      `/api/savings-goals/${createdGoalId}/entries`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "2030-02-01",
          type: "growth",
          amount: 2500,
          note: `${smokeTag} growth`,
        }),
      }
    );
    assert(
      entryResponse.status === 201,
      `Expected add entry to return 201, received ${entryResponse.status}`
    );
    const entryJson = (await entryResponse.json()) as {
      detail?: {
        goal: { isArchived: boolean };
        metrics: { totalGrowth: number };
        entries: Array<{ id: number; note?: string }>;
      };
    };
    assert(entryJson.detail, "Expected detail after adding entry");
    assert(entryJson.detail.metrics.totalGrowth === 2500, "Expected growth to accumulate");
    console.log("PASS savings goal entry");

    const createdEntry =
      entryJson.detail.entries.find((entry) => entry.note === `${smokeTag} growth`) ??
      null;
    assert(createdEntry, "Expected newly created savings goal entry to be returned");

    const updateEntryResponse = await request(
      `/api/savings-goals/${createdGoalId}/entries/${createdEntry.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "2030-02-10",
          type: "growth",
          amount: 3000,
          note: `${smokeTag} growth updated`,
        }),
      }
    );
    assert(
      updateEntryResponse.ok,
      `Expected update savings goal entry to pass, received ${updateEntryResponse.status}`
    );
    const updateEntryJson = (await updateEntryResponse.json()) as {
      detail?: {
        metrics: { totalGrowth: number };
        entries: Array<{ id: number; note?: string; amount: number }>;
      };
    };
    assert(updateEntryJson.detail, "Expected detail after updating entry");
    assert(
      updateEntryJson.detail.metrics.totalGrowth === 3000 &&
        updateEntryJson.detail.entries.some(
          (entry) =>
            entry.id === createdEntry.id &&
            entry.note === `${smokeTag} growth updated` &&
            entry.amount === 3000
        ),
      "Expected edited entry to update totals and persisted entry data"
    );
    console.log("PASS savings goal entry update");

    const archiveGoalResponse = await request(`/api/savings-goals/${createdGoalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isArchived: true }),
    });
    assert(
      archiveGoalResponse.ok,
      `Expected archive savings goal to pass, received ${archiveGoalResponse.status}`
    );
    const archiveGoalJson = (await archiveGoalResponse.json()) as {
      detail?: {
        goal: { isArchived: boolean };
      };
    };
    assert(
      archiveGoalJson.detail?.goal.isArchived,
      "Expected archived goal detail to reflect the archived state"
    );
    console.log("PASS savings goal archive");

    const archivedPortfolioResponse = await request("/api/savings-goals");
    assert(
      archivedPortfolioResponse.ok,
      `Expected archived portfolio fetch to pass, received ${archivedPortfolioResponse.status}`
    );
    const archivedPortfolioJson = (await archivedPortfolioResponse.json()) as {
      goals: Array<{ id: number }>;
      archivedGoals: Array<{ id: number }>;
      overview: { archivedGoalCount: number };
    };
    assert(
      archivedPortfolioJson.goals.every((goal) => goal.id !== createdGoalId) &&
        archivedPortfolioJson.archivedGoals.some((goal) => goal.id === createdGoalId) &&
        archivedPortfolioJson.overview.archivedGoalCount >= 1,
      "Expected archived goal to move out of the active portfolio and into archived goals"
    );
    console.log("PASS savings goal archived portfolio segregation");

    const archivedEntryMutationResponse = await request(
      `/api/savings-goals/${createdGoalId}/entries`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "2030-03-01",
          type: "contribution",
          amount: 500,
          note: `${smokeTag} should fail while archived`,
        }),
      }
    );
    assert(
      archivedEntryMutationResponse.status === 400,
      `Expected archived goal entry mutation to return 400, received ${archivedEntryMutationResponse.status}`
    );
    console.log("PASS savings goal archive mutation guard");

    const restoreGoalResponse = await request(`/api/savings-goals/${createdGoalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isArchived: false }),
    });
    assert(
      restoreGoalResponse.ok,
      `Expected restore savings goal to pass, received ${restoreGoalResponse.status}`
    );
    const restoreGoalJson = (await restoreGoalResponse.json()) as {
      detail?: {
        goal: { isArchived: boolean };
      };
    };
    assert(
      restoreGoalJson.detail && !restoreGoalJson.detail.goal.isArchived,
      "Expected restored goal to become active again"
    );
    console.log("PASS savings goal restore");

    const deleteEntryResponse = await request(
      `/api/savings-goals/${createdGoalId}/entries/${createdEntry.id}`,
      {
        method: "DELETE",
      }
    );
    assert(
      deleteEntryResponse.ok,
      `Expected delete savings goal entry to pass, received ${deleteEntryResponse.status}`
    );
    const deleteEntryJson = (await deleteEntryResponse.json()) as {
      detail?: {
        metrics: { totalGrowth: number };
        entries: Array<{ id: number }>;
      };
    };
    assert(
      deleteEntryJson.detail?.metrics.totalGrowth === 0 &&
        deleteEntryJson.detail.entries.every((entry) => entry.id !== createdEntry.id),
      "Expected deleting the edited entry to remove it and reset growth totals"
    );
    console.log("PASS savings goal entry delete");

    const deleteGoalResponse = await request(`/api/savings-goals/${createdGoalId}`, {
      method: "DELETE",
    });
    assert(
      deleteGoalResponse.ok,
      `Expected delete savings goal to pass, received ${deleteGoalResponse.status}`
    );
    const deleteGoalJson = (await deleteGoalResponse.json()) as {
      success?: boolean;
    };
    assert(deleteGoalJson.success, "Expected delete savings goal response to confirm success");
    createdGoalId = null;
    console.log("PASS savings goal delete");

    const previewRows = [
      {
        rowNumber: 1,
        rawRow: {
          วันที่: "2030-01-15",
          ประเภท: "รายจ่าย",
          จำนวน: "-1234",
          โน้ต: smokeTag,
        },
        normalized: {
          date: "2030-01-15",
          amount: 1234,
          type: "expense",
          category: "อาหาร",
          note: smokeTag,
          recipient: smokeTag,
          paymentChannel: "PromptPay",
        },
      },
    ];

    const previewResponse = await request("/api/import/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: `${smokeTag}.csv`,
        mode: "append",
        rows: previewRows,
      }),
    });
    assert(
      previewResponse.ok,
      `Expected import preview to pass, received ${previewResponse.status}`
    );
    const previewJson = (await previewResponse.json()) as {
      importRunId: number;
      summary: { newRows: number };
    };
    createdImportRunIds.push(previewJson.importRunId);
    assert(previewJson.summary.newRows === 1, "Expected preview to stage one new row");
    console.log("PASS import preview new");

    const commitResponse = await request("/api/import/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        importRunId: previewJson.importRunId,
      }),
    });
    assert(
      commitResponse.ok,
      `Expected import commit to pass, received ${commitResponse.status}`
    );
    const commitJson = (await commitResponse.json()) as {
      committedRows: number;
      transactions: Array<{ note?: string }>;
    };
    assert(commitJson.committedRows === 1, "Expected one committed import row");
    assert(
      commitJson.transactions.some((transaction) => transaction.note?.includes(smokeTag)),
      "Expected committed transaction to be returned"
    );
    console.log("PASS import commit");

    const duplicateResponse = await request("/api/import/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: `${smokeTag}-duplicate.csv`,
        mode: "append",
        rows: previewRows,
      }),
    });
    const duplicateJson = (await duplicateResponse.json()) as {
      importRunId: number;
      summary: { duplicateRows: number };
    };
    createdImportRunIds.push(duplicateJson.importRunId);
    assert(
      duplicateJson.summary.duplicateRows === 1,
      "Expected duplicate preview to identify the existing transaction"
    );
    console.log("PASS import duplicate detection");

    const transferPreviewRows = [
      {
        rowNumber: 1,
        rawRow: {
          วันที่: "2030-01-18",
          เวลา: "14:15",
          ประเภท: "ย้ายเงิน",
          จำนวน: "2500",
          ผู้รับ: `${smokeTag} self`,
        },
        normalized: {
          date: "2030-01-18",
          time: "14:15",
          amount: 2500,
          type: "transfer",
          category: "ย้ายเงิน",
          note: `${smokeTag} transfer`,
          recipient: `${smokeTag} self`,
          paymentChannel: "บัญชี",
          payFrom: "ไทยพาณิชย์",
        },
      },
    ];

    const transferPreviewResponse = await request("/api/import/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: `${smokeTag}-transfer.csv`,
        mode: "append",
        rows: transferPreviewRows,
      }),
    });
    assert(
      transferPreviewResponse.ok,
      `Expected transfer preview to pass, received ${transferPreviewResponse.status}`
    );
    const transferPreviewJson = (await transferPreviewResponse.json()) as {
      importRunId: number;
      summary: {
        newRows: number;
        incomeRows: number;
        expenseRows: number;
        transferRows: number;
        totalTransfer: number;
      };
    };
    createdImportRunIds.push(transferPreviewJson.importRunId);
    assert(
      transferPreviewJson.summary.newRows === 1,
      "Expected transfer preview to stage one new row"
    );
    assert(
      transferPreviewJson.summary.transferRows === 1 &&
        transferPreviewJson.summary.incomeRows === 0 &&
        transferPreviewJson.summary.expenseRows === 0 &&
        transferPreviewJson.summary.totalTransfer === 2500,
      "Expected transfer preview to classify transfer rows separately"
    );
    console.log("PASS import transfer preview");

    const transferCommitResponse = await request("/api/import/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        importRunId: transferPreviewJson.importRunId,
      }),
    });
    assert(
      transferCommitResponse.ok,
      `Expected transfer commit to pass, received ${transferCommitResponse.status}`
    );
    const transferCommitJson = (await transferCommitResponse.json()) as {
      committedRows: number;
      summary: { transferRows: number; totalTransfer: number };
      transactions: Array<{ type: string; note?: string }>;
    };
    assert(
      transferCommitJson.committedRows === 1,
      "Expected transfer commit to insert one transfer row"
    );
    assert(
      transferCommitJson.summary.transferRows === 1 &&
        transferCommitJson.summary.totalTransfer === 2500,
      "Expected transfer commit summary to preserve transfer totals"
    );
    assert(
      transferCommitJson.transactions.some(
        (transaction) =>
          transaction.type === "transfer" &&
          transaction.note?.includes(`${smokeTag} transfer`)
      ),
      "Expected committed transfer transaction to be returned"
    );
    console.log("PASS import transfer commit");

    const batchDuplicateRows = [
      {
        rowNumber: 1,
        rawRow: {
          วันที่: "2030-01-20",
          เวลา: "08:45",
          ประเภท: "รายจ่าย",
          จำนวน: "-345",
          โน๊ต: `${smokeTag} batch`,
        },
        normalized: {
          date: "2030-01-20",
          time: "08:45",
          amount: 345,
          type: "expense",
          category: "อาหาร",
          note: `${smokeTag} batch`,
          recipient: `${smokeTag} vendor`,
          paymentChannel: "PromptPay",
        },
      },
      {
        rowNumber: 2,
        rawRow: {
          วันที่: "2030-01-20",
          เวลา: "08:45",
          ประเภท: "รายจ่าย",
          จำนวน: "-345",
          โน๊ต: `${smokeTag} batch`,
        },
        normalized: {
          date: "2030-01-20",
          time: "08:45",
          amount: 345,
          type: "expense",
          category: "อาหาร",
          note: `${smokeTag} batch`,
          recipient: `${smokeTag} vendor`,
          paymentChannel: "PromptPay",
        },
      },
    ];

    const batchDuplicateResponse = await request("/api/import/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: `${smokeTag}-batch-duplicate.csv`,
        mode: "append",
        rows: batchDuplicateRows,
      }),
    });
    assert(
      batchDuplicateResponse.ok,
      `Expected intra-file duplicate preview to pass, received ${batchDuplicateResponse.status}`
    );
    const batchDuplicateJson = (await batchDuplicateResponse.json()) as {
      importRunId: number;
      summary: { newRows: number; duplicateRows: number };
    };
    createdImportRunIds.push(batchDuplicateJson.importRunId);
    assert(
      batchDuplicateJson.summary.newRows === 2,
      "Expected intra-file identical rows to remain distinct new rows"
    );
    assert(
      batchDuplicateJson.summary.duplicateRows === 0,
      "Expected intra-file identical rows not to collapse into duplicates"
    );
    console.log("PASS import intra-file duplicate preview");

    const batchDuplicateCommitResponse = await request("/api/import/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        importRunId: batchDuplicateJson.importRunId,
      }),
    });
    assert(
      batchDuplicateCommitResponse.ok,
      `Expected intra-file duplicate commit to pass, received ${batchDuplicateCommitResponse.status}`
    );
    const batchDuplicateCommitJson = (await batchDuplicateCommitResponse.json()) as {
      committedRows: number;
      summary: { newRows: number; duplicateRows: number };
    };
    assert(
      batchDuplicateCommitJson.committedRows === 2,
      "Expected intra-file identical rows to commit as two distinct transactions"
    );
    assert(
      batchDuplicateCommitJson.summary.newRows === 2 &&
        batchDuplicateCommitJson.summary.duplicateRows === 0,
      "Expected commit summary to stay aligned with occurrence-aware duplicate handling"
    );
    console.log("PASS import intra-file duplicate commit alignment");

    const conflictResponse = await request("/api/import/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: `${smokeTag}-conflict.csv`,
        mode: "append",
        rows: [
          {
            rowNumber: 1,
            rawRow: {
              วันที่: "2030-01-15",
              ประเภท: "รายจ่าย",
              จำนวน: "-1234",
              โน้ต: `${smokeTag} variant`,
            },
            normalized: {
              date: "2030-01-15",
              amount: 1234,
              type: "expense",
              category: "อาหาร",
              note: `${smokeTag} variant`,
              recipient: smokeTag,
              paymentChannel: "Credit Card",
            },
          },
        ],
      }),
    });
    const conflictJson = (await conflictResponse.json()) as {
      importRunId: number;
      summary: { conflictRows: number };
    };
    createdImportRunIds.push(conflictJson.importRunId);
    assert(
      conflictJson.summary.conflictRows === 1,
      "Expected conflict preview to flag a near-duplicate transaction"
    );
    console.log("PASS import conflict detection");

    const reviewImportAsNewResponse = await request("/api/import/review", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        importRunId: conflictJson.importRunId,
        rowNumber: 1,
        action: "import_as_new",
      }),
    });
    assert(
      reviewImportAsNewResponse.ok,
      `Expected import conflict review (import_as_new) to pass, received ${reviewImportAsNewResponse.status}`
    );
    const reviewImportAsNewJson = (await reviewImportAsNewResponse.json()) as {
      previewStatus: string;
      reviewAction: string;
      summary: { newRows: number; conflictRows: number };
    };
    assert(
      reviewImportAsNewJson.previewStatus === "new" &&
        reviewImportAsNewJson.reviewAction === "import_as_new" &&
        reviewImportAsNewJson.summary.newRows === 1 &&
        reviewImportAsNewJson.summary.conflictRows === 0,
      "Expected reviewed conflict row to become a new row before commit"
    );
    console.log("PASS import conflict review import_as_new");

    const reviewedConflictCommitResponse = await request("/api/import/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        importRunId: conflictJson.importRunId,
      }),
    });
    assert(
      reviewedConflictCommitResponse.ok,
      `Expected reviewed conflict commit to pass, received ${reviewedConflictCommitResponse.status}`
    );
    const reviewedConflictCommitJson = (await reviewedConflictCommitResponse.json()) as {
      committedRows: number;
      summary: { conflictRows: number };
      transactions: Array<{ note?: string }>;
    };
    assert(
      reviewedConflictCommitJson.committedRows === 1 &&
        reviewedConflictCommitJson.summary.conflictRows === 0,
      "Expected reviewed conflict import_as_new to commit one row without pending conflicts"
    );
    assert(
      reviewedConflictCommitJson.transactions.some((transaction) =>
        transaction.note?.includes(`${smokeTag} variant`)
      ),
      "Expected reviewed conflict import_as_new to appear in the transaction feed"
    );
    console.log("PASS import conflict review commit import_as_new");

    const keepExistingPreviewResponse = await request("/api/import/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: `${smokeTag}-keep-existing.csv`,
        mode: "append",
        rows: [
          {
            rowNumber: 1,
            rawRow: {
              วันที่: "2030-01-15",
              ประเภท: "รายจ่าย",
              จำนวน: "-1234",
              โน้ต: `${smokeTag} variant keep`,
            },
            normalized: {
              date: "2030-01-15",
              amount: 1234,
              type: "expense",
              category: "อาหาร",
              note: `${smokeTag} variant keep`,
              recipient: smokeTag,
              paymentChannel: "Debit Card",
            },
          },
        ],
      }),
    });
    const keepExistingPreviewJson = (await keepExistingPreviewResponse.json()) as {
      importRunId: number;
      summary: { conflictRows: number };
    };
    createdImportRunIds.push(keepExistingPreviewJson.importRunId);
    assert(
      keepExistingPreviewJson.summary.conflictRows === 1,
      "Expected second conflict preview to flag a near-duplicate transaction"
    );

    const reviewKeepExistingResponse = await request("/api/import/review", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        importRunId: keepExistingPreviewJson.importRunId,
        rowNumber: 1,
        action: "keep_existing",
      }),
    });
    assert(
      reviewKeepExistingResponse.ok,
      `Expected import conflict review (keep_existing) to pass, received ${reviewKeepExistingResponse.status}`
    );
    const reviewKeepExistingJson = (await reviewKeepExistingResponse.json()) as {
      previewStatus: string;
      reviewAction: string;
      summary: { duplicateRows: number; conflictRows: number };
    };
    assert(
      reviewKeepExistingJson.previewStatus === "duplicate" &&
        reviewKeepExistingJson.reviewAction === "keep_existing" &&
        reviewKeepExistingJson.summary.duplicateRows === 1 &&
        reviewKeepExistingJson.summary.conflictRows === 0,
      "Expected keep_existing review action to convert the conflict into a duplicate"
    );
    console.log("PASS import conflict review keep_existing");

    const keepExistingCommitResponse = await request("/api/import/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        importRunId: keepExistingPreviewJson.importRunId,
      }),
    });
    assert(
      keepExistingCommitResponse.ok,
      `Expected keep_existing conflict commit to pass, received ${keepExistingCommitResponse.status}`
    );
    const keepExistingCommitJson = (await keepExistingCommitResponse.json()) as {
      committedRows: number;
      summary: { duplicateRows: number; conflictRows: number };
    };
    assert(
      keepExistingCommitJson.committedRows === 0 &&
        keepExistingCommitJson.summary.duplicateRows === 1 &&
        keepExistingCommitJson.summary.conflictRows === 0,
      "Expected keep_existing review action to avoid inserting a new transaction"
    );
    console.log("PASS import conflict review commit keep_existing");

    console.log("Smoke tests completed successfully.");
  } finally {
    await cleanup();
  }
}

void main().catch((error) => {
  console.error("Smoke tests failed");
  console.error(error);
  process.exitCode = 1;
});
