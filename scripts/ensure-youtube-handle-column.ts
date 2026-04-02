import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const ENV_FILES = [resolve(ROOT, ".env.local"), resolve(ROOT, ".env")];

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

async function main() {
  loadLocalEnv();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL.");
  }

  const sql = neon(databaseUrl);

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS youtube_handle varchar(255)
  `;

  console.info("Column users.youtube_handle is present (or was already there).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
