import { db } from "../src/db";
import { accounts, transactions } from "../src/db/schema";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

async function main() {
  console.log("Starting migration of notes to transactions...");

  const allAccounts = await db.select().from(accounts);

  for (const account of allAccounts) {
    if (!account.notes || !account.notes.includes("ข้อมูลย่อยจากภาพ:")) {
      continue;
    }

    console.log(`Processing Account: ${account.name} (ID: ${account.id})`);

    const lines = account.notes.split("\n");
    const startIndex = lines.findIndex(line => line.includes("ข้อมูลย่อยจากภาพ:"));
    
    if (startIndex === -1) continue;

    const transactionLines = lines.slice(startIndex + 1).filter(line => line.trim().startsWith("-"));
    
    const newTransactions = [];
    for (const line of transactionLines) {
      // Pattern: - YYYY-MM-DD: Description ฿Amount [+ Description ฿Amount ...]
      const match = line.match(/^- (\d{4}-\d{2}-\d{2}): (.*)$/);
      if (!match) continue;

      const date = match[1];
      const content = match[2];

      // Split by '+' for multiple items in one line
      const items = content.split("+");
      for (const item of items) {
        const itemMatch = item.match(/(.*?)\s*฿([\d,.]+)/);
        if (!itemMatch) continue;

        const note = itemMatch[1].trim();
        const amountStr = itemMatch[2].replace(/,/g, "");
        const amount = parseFloat(amountStr);
        const amountSatang = Math.round(amount * 100);

        // Create a unique fingerprint
        const fingerprint = crypto.createHash("md5")
          .update(`${account.id}-${date}-${note}-${amountSatang}-${Date.now()}-${Math.random()}`)
          .digest("hex");

        newTransactions.push({
          transactionDate: date,
          amountSatang: amountSatang,
          type: "income" as const, // Default to income for these historical records
          category: "Migration",
          note: note,
          accountId: account.id,
          fingerprint: fingerprint,
          source: "manual" as const,
        });
      }
    }

    if (newTransactions.length > 0) {
      console.log(`Inserting ${newTransactions.length} transactions for ${account.name}...`);
      await db.insert(transactions).values(newTransactions);

      // Clean up notes: remove the "ข้อมูลย่อยจากภาพ:" section and everything after it
      const newNotes = lines.slice(0, startIndex).join("\n").trim();
      
      console.log(`Updating account ${account.name} notes and balance...`);
      await db.update(accounts)
        .set({ 
          notes: newNotes || null,
          // We keep the current balance as is, because the user said "map ยอดคงเหลือ ให้ ... เหมือนเดิม"
          // which implies the current balance is already correct, just the transactions were missing.
        })
        .where(eq(accounts.id, account.id));
    }
  }

  console.log("Migration completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
