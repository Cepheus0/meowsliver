import "dotenv/config";
import { createAccount, listAccounts, updateAccount } from "../src/lib/server/accounts";
import { YELLOW_ACCOUNT_CATALOG } from "../src/lib/account-catalog";

function byName(value: string) {
  return value.trim().toLowerCase();
}

async function main() {
  const existingAccounts = await listAccounts();
  const existingByName = new Map(
    existingAccounts.map((account) => [byName(account.name), account])
  );

  let created = 0;
  let updated = 0;

  for (const entry of YELLOW_ACCOUNT_CATALOG) {
    const existing = existingByName.get(byName(entry.name));

    if (existing) {
      await updateAccount(existing.id, {
        name: entry.name,
        type: entry.type,
        currentBalance: entry.currentBalance,
        creditLimit:
          entry.type === "credit_card" ? (entry.creditLimit ?? null) : null,
        notes: entry.notes ?? null,
        aliases: entry.aliases,
        isArchived: false,
        isDefault: Boolean(entry.isDefault),
      });
      updated += 1;
      continue;
    }

    await createAccount({
      name: entry.name,
      type: entry.type,
      initialBalance: entry.currentBalance,
      creditLimit: entry.creditLimit,
      notes: entry.notes,
      aliases: entry.aliases,
      isDefault: Boolean(entry.isDefault),
    });
    created += 1;
  }

  const finalAccounts = await listAccounts();
  const activeAccounts = finalAccounts.filter((account) => !account.isArchived);
  const totalAssets = activeAccounts
    .filter((account) => account.currentBalance > 0)
    .reduce((sum, account) => sum + account.currentBalance, 0);
  const totalLiabilities = activeAccounts
    .filter((account) => account.currentBalance < 0)
    .reduce((sum, account) => sum + Math.abs(account.currentBalance), 0);

  console.log(
    JSON.stringify(
      {
        created,
        updated,
        activeAccountCount: activeAccounts.length,
        totalAssets,
        totalLiabilities,
        netWorth: totalAssets - totalLiabilities,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("Failed to seed yellow accounts");
  console.error(error);
  process.exit(1);
});
