import type { DefaultSession } from "next-auth";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      id?: string;
      isLinked?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    googleUserId?: string;
  }
}
