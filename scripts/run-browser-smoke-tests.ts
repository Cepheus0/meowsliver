import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright-core";

const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const currentYear = new Date().getFullYear();
const outputDir = path.join(process.cwd(), "output", "playwright");
const screenshotPath = path.join(outputDir, "transactions-browser-smoke.png");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function buildPersistedState() {
  return {
    state: {
      importedTransactions: Array.from({ length: 130 }, (_, index) => ({
        id: `browser-smoke-${index + 1}`,
        date: `${currentYear}-03-${String((index % 28) + 1).padStart(2, "0")}`,
        amount: 1000 + index,
        category: index % 2 === 0 ? "อาหาร" : "เดินทาง",
        type: index % 5 === 0 ? "income" : "expense",
        note: `Browser smoke transaction ${index + 1}`,
      })),
      selectedYear: currentYear,
      sidebarCollapsed: false,
    },
    version: 0,
  };
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
      return summary.includes("130 รายการ");
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

    const tableRows = page.locator("tbody tr");
    await tableRows.first().waitFor();
    assert(
      (await tableRows.count()) === 50,
      "Expected /transactions to default to 50 rows per page"
    );

    await page.getByRole("button", { name: "25" }).click();
    assert(
      (await tableRows.count()) === 25,
      "Expected page size control to switch to 25 rows"
    );

    await page.getByRole("button", { name: "ถัดไป" }).click();
    const footerText = await page.textContent("body");
    assert(
      footerText?.includes("หน้า 2 จาก 6"),
      "Expected pagination to advance to page 2 after clicking next"
    );
    assert(
      footerText?.includes("กำลังแสดงรายการที่ 26-50 จากทั้งหมด 130 รายการ"),
      "Expected page 2 range summary to be correct"
    );

    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`PASS browser smoke /transactions (${screenshotPath})`);
  } finally {
    await context.close();
    await browser.close();
  }
}

void main().catch((error) => {
  console.error("Browser smoke test failed");
  console.error(error);
  process.exitCode = 1;
});
