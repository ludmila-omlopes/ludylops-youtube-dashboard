import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  STREAMERBOT_SHARED_SECRET: z.string().optional(),
  BRIDGE_SHARED_SECRET: z.string().optional(),
  YOUTUBE_API_KEY: z.string().optional(),
  STREAM_YOUTUBE_CHANNEL_ID: z.string().optional(),
  ADMIN_EMAILS: z.string().optional(),
  APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);
export const isProduction = process.env.NODE_ENV === "production";

export const adminEmails = new Set(
  (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

export const isDemoMode = !env.DATABASE_URL;
export const isDemoAuthEnabled = isDemoMode && !isProduction;
export const authSecret = env.NEXTAUTH_SECRET ?? (!isProduction ? "dev-secret" : undefined);

if (isProduction && !env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required in production.");
}

if (!authSecret) {
  throw new Error("NEXTAUTH_SECRET is required in production.");
}
