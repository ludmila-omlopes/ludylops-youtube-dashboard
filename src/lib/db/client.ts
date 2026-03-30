import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { env, isDemoMode } from "@/lib/env";
import * as schema from "@/lib/db/schema";

export function getDb() {
  if (isDemoMode || !env.DATABASE_URL) {
    return null;
  }

  return drizzle(neon(env.DATABASE_URL), { schema });
}
