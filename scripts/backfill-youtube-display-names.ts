import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";

type ViewerRow = {
  id: string;
  youtube_channel_id: string;
  youtube_display_name: string;
};

type YoutubeChannel = {
  id: string;
  snippet?: {
    title?: string;
  };
};

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const ENV_FILES = [resolve(ROOT, ".env.local"), resolve(ROOT, ".env")];
const BATCH_SIZE = 50;

function loadEnvFile(filepath: string) {
  if (!existsSync(filepath)) {
    return;
  }

  const raw = readFileSync(filepath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = trimmed.slice(equalIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function loadLocalEnv() {
  for (const filepath of ENV_FILES) {
    loadEnvFile(filepath);
  }
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run");
  const verbose = process.argv.includes("--verbose");
  return { dryRun, verbose };
}

async function fetchYoutubeTitles(channelIds: string[], apiKey: string) {
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("id", channelIds.join(","));
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`YouTube API request failed with ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as { items?: YoutubeChannel[] };
  return new Map(
    (data.items ?? [])
      .map((item) => [item.id, item.snippet?.title?.trim() ?? ""] as const)
      .filter((entry) => entry[1].length > 0),
  );
}

async function main() {
  loadLocalEnv();

  const { dryRun, verbose } = parseArgs();
  const databaseUrl = process.env.DATABASE_URL;
  const youtubeApiKey = process.env.YOUTUBE_API_KEY;

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL. Add it to .env.local/.env or export it before running.");
  }

  if (!youtubeApiKey) {
    throw new Error("Missing YOUTUBE_API_KEY. Add it to .env.local/.env or export it before running.");
  }

  const sql = neon(databaseUrl);
  const brokenRows = (await sql`
    SELECT id, youtube_channel_id, youtube_display_name
    FROM users
    WHERE youtube_channel_id IS NOT NULL
      AND youtube_display_name = youtube_channel_id
    ORDER BY created_at ASC
  `) as ViewerRow[];

  if (brokenRows.length === 0) {
    console.info("No users found with youtube_display_name equal to youtube_channel_id.");
    return;
  }

  console.info(`Found ${brokenRows.length} users to inspect.`);

  let updated = 0;
  let skipped = 0;
  let unresolved = 0;

  for (const rows of chunk(brokenRows, BATCH_SIZE)) {
    const channelIds = rows.map((row) => row.youtube_channel_id);
    const titlesByChannelId = await fetchYoutubeTitles(channelIds, youtubeApiKey);

    for (const row of rows) {
      const resolvedTitle = titlesByChannelId.get(row.youtube_channel_id);
      if (!resolvedTitle) {
        unresolved += 1;
        if (verbose) {
          console.warn(`No YouTube title found for ${row.youtube_channel_id} (${row.id}).`);
        }
        continue;
      }

      if (resolvedTitle === row.youtube_display_name) {
        skipped += 1;
        continue;
      }

      if (dryRun) {
        updated += 1;
        console.info(`[dry-run] ${row.id}: ${row.youtube_display_name} -> ${resolvedTitle}`);
        continue;
      }

      await sql`
        UPDATE users
        SET youtube_display_name = ${resolvedTitle}
        WHERE id = ${row.id}
      `;
      updated += 1;

      if (verbose) {
        console.info(`Updated ${row.id}: ${row.youtube_display_name} -> ${resolvedTitle}`);
      }
    }
  }

  console.info(
    dryRun
      ? `Dry run complete. Would update ${updated} users, skip ${skipped}, unresolved ${unresolved}.`
      : `Backfill complete. Updated ${updated} users, skipped ${skipped}, unresolved ${unresolved}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
