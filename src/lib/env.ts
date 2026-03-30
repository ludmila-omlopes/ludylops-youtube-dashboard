import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  STREAMERBOT_SHARED_SECRET: z.string().optional(),
  BRIDGE_SHARED_SECRET: z.string().optional(),
  ADMIN_EMAILS: z.string().optional(),
  APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);

export const adminEmails = new Set(
  (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

export const isDemoMode = !env.DATABASE_URL;
