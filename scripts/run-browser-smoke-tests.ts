import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { Client } from "pg";
import { chromium } from "playwright-core";

const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const browserTestYear = 2030;
const outputDir = path.join(process.cwd(), "output", "playwright");
const screenshotPath = path.join(outputDir, "transactions-browser-smoke.png");
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/meowsliver";
const smokeTag = `browser-smoke-db-${Date.now()}`;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function buildPersistedState() {
  return {
    state: {
      importedTransactions: Array.from({ length: 130 }, (_, index) => ({
        id: `browser-smoke-stale-${index + 1}`,
        date: `${browserTestYear}-03-${String((index % 28) + 1).padStart(2, "0")}`,
        amount: 1000 + index,
        category: index % 2 === 0 ? "อาหาร" : "เดินทาง",
        type: index % 5 === 0 ? "income" : "expense",
        note: `Stale browser smoke transaction ${index + 1}`,
      })),
      selectedYear: browserTestYear,
      sidebarCollapsed: false,
    },
    version: 0,
  };
}

async function seedTransactions() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("DELETE FROM transactions WHERE fingerprint LIKE $1", [
      `${smokeTag}%`,
    ]);

    for (let index = 0; index < 60; index += 1) {
      const amount = 500 + index;
      const type =
        index % 10 === 0 ? "transfer" : index % 6 === 0 ? "income" : "expense";
      await client.query(
        `INSERT INTO transactions (
          transaction_date,
          amount_satang,
          type,
          category,
          note,
          fingerprint,
          source
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          `${browserTestYear}-04-${String((index % 28) + 1).padStart(2, "0")}`,
          amount * 100,
          type,
          type === "transfer" ? "ย้ายเงิน" : index % 2 === 0 ? "อาหาร" : "เดินทาง",
          `${smokeTag} transaction ${index + 1}`,
          `${smokeTag}-${index + 1}`,
          "manual",
        ]
      );
    }
  } finally {
    await client.end();
  }
}

async function cleanupTransactions() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("DELETE FROM transactions WHERE fingerprint LIKE $1", [
      `${smokeTag}%`,
    ]);
  } finally {
    await client.end();
  }
}

function resolveExecutablePath() {
  const envPath =
    process.env.PLAYWRIGHT_FALLBACK_EXECUTABLE ??
    process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }

  const cacheDir = path.join(os.homedir(), "Library", "Caches", "ms-playwright");
  if (!fs.existsSync(cacheDir)) {
    throw new Error(
      "Playwright browser cache not found. Install Chromium or set PLAYWRIGHT_FALLBACK_EXECUTABLE."
    );
  }

  const chromiumCandidates = fs
    .readdirSync(cacheDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("chromium-"))
    .sort((left, right) =>
      right.name.localeCompare(left.name, undefined, { numeric: true })
    );

  for (const candidate of chromiumCandidates) {
    const executablePath = path.join(
      cacheDir,
      candidate.name,
      "chrome-mac-arm64",
      "Google Chrome for Testing.app",
      "Contents",
      "MacOS",
      "Google Chrome for Testing"
    );

    if (fs.existsSync(executablePath)) {
      return executablePath;
    }
  }

  throw new Error(
    "Unable to locate a Playwright Chromium executable. Set PLAYWRIGHT_FALLBACK_EXECUTABLE."
  );
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  await seedTransactions();

  const browser = await chromium.launch({
    executablePath: resolveExecutablePath(),
    headless: true,
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.addInitScript((persistedState) => {
    window.localStorage.setItem(
      "moneycat-finance-store",
      JSON.stringify(persistedState)
    );
  }, buildPersistedState());

  try {
    await page.goto(`${appUrl}/transactions`, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });

    await page.waitForFunction(() => {
      const summary = document.body.innerText;
      return summary.includes("60 รายการ");
    });

    const pageText = await page.textContent("body");
    assert(pageText, "Expected /transactions page to render body text");
    assert(
      !pageText.includes("Hydration failed"),
      "Expected /transactions to avoid hydration mismatch errors"
    );
    assert(
      !pageText.includes("Recoverable Error"),
      "Expected /transactions to avoid React recoverable error overlays"
    );
    assert(
      !pageText.includes("130 รายการ"),
      "Expected DB-backed hydration to override stale local browser cache"
    );

    const tableRows = page.locator("tbody tr");
    await tableRows.first().waitFor();
    assert(
      (await tableRows.count()) === 50,
      "Expected /transactions to default to 50 rows per page"
    );

    await page.getByRole("button", { name: "ย้ายเงิน" }).click();
    assert(
      (await tableRows.count()) === 6,
      "Expected transfer filter to show only transfer rows"
    );
    const transferFilterText = await page.textContent("body");
    assert(
      transferFilterText?.includes("จาก 6 รายการ"),
      "Expected transfer filter summary to show the transfer row count"
    );

    await page.getByRole("button", { name: "ทั้งหมด" }).click();
    assert(
      (await tableRows.count()) === 50,
      "Expected returning to all transactions to restore the default paginated row count"
    );

    await page.getByRole("button", { name: "25" }).click();
    assert(
      (await tableRows.count()) === 25,
      "Expected page size control to switch to 25 rows"
    );

    await page.getByRole("button", { name: "ถัดไป" }).click();
    const footerText = await page.textContent("body");
    assert(
      footerText?.includes("หน้า 2 จาก 3"),
      "Expected pagination to advance to page 2 after clicking next"
    );
    assert(
      footerText?.includes("กำลังแสดงรายการที่ 26-50 จากทั้งหมด 60 รายการ"),
      "Expected page 2 range summary to be correct"
    );

    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`PASS browser smoke /transactions (${screenshotPath})`);
  } finally {
    await context.close();
    await browser.close();
    await cleanupTransactions();
  }
}

void main().catch((error) => {
  console.error("Browser smoke test failed");
  console.error(error);
  process.exitCode = 1;
});
