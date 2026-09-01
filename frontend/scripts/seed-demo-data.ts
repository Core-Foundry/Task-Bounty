import { resetDemoData, seedDemoData } from "../src/lib/demo-seed";

const shouldResetOnly = process.argv.includes("--reset");

if (shouldResetOnly) {
  resetDemoData();
  console.log("Demo data reset for this process.");
} else {
  const summary = seedDemoData();
  console.table(summary);
  console.log("Demo data seeded for this process.");
}
