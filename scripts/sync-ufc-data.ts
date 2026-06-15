// One-off / cron runner for the UFC data mirror sync.
//   npx tsx scripts/sync-ufc-data.ts
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { syncUfcData } = await import("../src/lib/ufcData/sync");
  const t = Date.now();
  const result = await syncUfcData();
  console.log("Sync complete in", ((Date.now() - t) / 1000).toFixed(1), "s");
  console.table(result);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
