import { db } from "../src/db";
import { accounts } from "../src/db/schema";

async function main() {
  console.log("Checking account notes...");
  const allAccounts = await db.select().from(accounts);
  
  for (const account of allAccounts) {
    console.log(`--- Account ID: ${account.id} | Name: ${account.name} ---`);
    console.log(`Balance: ${account.currentBalanceSatang / 100}`);
    console.log(`Notes: ${account.notes || "None"}`);
    console.log("");
  }
  
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
