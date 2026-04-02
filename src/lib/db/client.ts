import ws from "ws";
import { drizzle } from "drizzle-orm/neon-serverless";

import { env, isDemoMode } from "@/lib/env";
import * as schema from "@/lib/db/schema";

declare global {
  var __lojaDb:
    | ReturnType<typeof drizzle<typeof schema>>
    | undefined;
}

export function getDb() {
  if (isDemoMode || !env.DATABASE_URL) {
    return null;
  }

  if (!globalThis.__lojaDb) {
    globalThis.__lojaDb = drizzle({
      connection: env.DATABASE_URL,
      schema,
      ws,
    });
  }

  return globalThis.__lojaDb;
}
