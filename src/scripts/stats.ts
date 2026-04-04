import { readFileSync, writeFileSync, existsSync } from "node:fs";
import type { ImportData } from "get-all-npm-contributions";
import { COMMIT_MSG_PATH, ENCRYPTED_PATH, ENCRYPTION_KEY, STATS_PATH } from "../constants.js";
import { decrypt } from "../util/crypto.js";
import { loadConfig } from "../util/loadConfig.js";
import { aggregateImportData } from "../util/aggregateImportData.js";

function main() {
  if (!existsSync(ENCRYPTED_PATH)) {
    console.log("No sync data found, skipping stats generation");
    return;
  }

  const raw = readFileSync(ENCRYPTED_PATH);
  const importData: ImportData = JSON.parse(decrypt(raw, ENCRYPTION_KEY).toString("utf-8"));

  if (!Object.keys(importData.packages).length) {
    console.log("No package data, skipping stats update");
    return;
  }

  // Aggregate and write stats
  const userConfig = loadConfig();
  const stats = aggregateImportData(importData, userConfig.exclude, userConfig.timeZone);
  writeFileSync(STATS_PATH, JSON.stringify(stats, null, 2));

  // Write commit message
  const now = new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
  const newProgress = importData.importState?.importProgress?.progressStats?.new;
  const descriptionLines: string[] = [];
  if (newProgress) {
    if (newProgress.packageCount > 0) descriptionLines.push(`${newProgress.packageCount} new packages`);
    if (newProgress.versionCount > 0) descriptionLines.push(`${newProgress.versionCount} new versions`);
    if (newProgress.downloadDayCount > 0) descriptionLines.push(`${newProgress.downloadDayCount} new download days`);
    if (newProgress.totalDownloads > 0) descriptionLines.push(`${newProgress.totalDownloads} total new downloads`);
  }

  const commitTitle = `Update stats: ${now}`;
  const commitBody = descriptionLines.length > 0 ? `\n${descriptionLines.join("\n")}` : "";
  writeFileSync(COMMIT_MSG_PATH, commitTitle + commitBody);

  console.log(`Stats updated: ${stats.packages.length} packages`);
}

main();
