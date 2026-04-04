import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./index";

async function main() {
  await migrate(db, {
    migrationsFolder: "./drizzle",
  });
  await pool.end();
}

main().catch(async (error) => {
  console.error("Database migration failed.");
  console.error(error);
  await pool.end();
  process.exit(1);
});
