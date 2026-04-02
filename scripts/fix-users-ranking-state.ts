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

  const adminEmails = new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );

  const sql = neon(databaseUrl);

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS exclude_from_ranking boolean DEFAULT false NOT NULL
  `;

  await sql`
    UPDATE users
    SET youtube_channel_id = CASE
      WHEN google_user_id IS NOT NULL THEN LEFT('session:' || google_user_id, 128)
      WHEN email IS NOT NULL THEN LEFT('session:' || LOWER(email), 128)
      ELSE LEFT('session:' || id, 128)
    END
    WHERE youtube_channel_id IS NULL
  `;

  if (adminEmails.size > 0) {
    await sql`
      UPDATE users
      SET exclude_from_ranking = true
      WHERE email IS NOT NULL
        AND LOWER(email) = ANY(${Array.from(adminEmails)})
    `;
  }

  await sql`
    UPDATE users
    SET exclude_from_ranking = true
    WHERE google_user_id IS NOT NULL
      AND is_linked = false
  `;

  await sql`
    ALTER TABLE users
    ALTER COLUMN youtube_channel_id SET NOT NULL
  `;

  const [summary] = (await sql`
    SELECT
      COUNT(*) FILTER (WHERE youtube_channel_id IS NULL) AS null_channel_ids,
      COUNT(*) FILTER (WHERE exclude_from_ranking = true) AS excluded_users
    FROM users
  `) as Array<{ null_channel_ids: string; excluded_users: string }>;

  console.info(
    `User repair complete. null_channel_ids=${summary?.null_channel_ids ?? "0"}, excluded_users=${summary?.excluded_users ?? "0"}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
