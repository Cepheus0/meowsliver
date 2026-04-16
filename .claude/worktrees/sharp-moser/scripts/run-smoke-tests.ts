import { inArray } from "drizzle-orm";
import { db } from "../src/db";
import {
  importRunRows,
  importRuns,
  savingsGoalEntries,
  savingsGoals,
  transactions,
} from "../src/db/schema";

const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const smokeTag = `SMOKE_${Date.now()}`;
const createdImportRunIds: number[] = [];
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
    await expectOk("/api/savings-goals", "application/json");
    console.log("PASS api /api/savings-goals");

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
        metrics: { totalGrowth: number };
        entries: Array<{ note?: string }>;
      };
    };
    assert(entryJson.detail, "Expected detail after adding entry");
    assert(entryJson.detail.metrics.totalGrowth === 2500, "Expected growth to accumulate");
    console.log("PASS savings goal entry");

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
      batchDuplicateJson.summary.newRows === 1,
      "Expected intra-file duplicate preview to keep only one row as new"
    );
    assert(
      batchDuplicateJson.summary.duplicateRows === 1,
      "Expected intra-file duplicate preview to classify the second row as duplicate"
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
      batchDuplicateCommitJson.committedRows === 1,
      "Expected intra-file duplicate commit to insert only one row"
    );
    assert(
      batchDuplicateCommitJson.summary.newRows === 1 &&
        batchDuplicateCommitJson.summary.duplicateRows === 1,
      "Expected commit summary to stay aligned with intra-file duplicate preview"
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
