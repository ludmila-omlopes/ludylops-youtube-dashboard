import type { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { ensureViewerFromSession } from "@/lib/db/repository";
import { env, isDemoMode } from "@/lib/env";

const providers = [];

if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    }),
  );
}

if (isDemoMode) {
  providers.push(
    CredentialsProvider({
      name: "Demo",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        if (!email || typeof email !== "string") {
          return null;
        }

        return {
          id: email,
          email,
          name: email.split("@")[0],
        };
      },
    }),
  );
}

export const authOptions = {
  secret: env.NEXTAUTH_SECRET ?? "dev-secret",
  providers,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, account, profile, user }) {
      if (user?.email) {
        token.email = user.email;
      }

      if (account?.provider === "google") {
        token.googleUserId = account.providerAccountId;
      }

      if (profile && "picture" in profile && typeof profile.picture === "string") {
        token.picture = profile.picture;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user?.email) {
        const viewer = await ensureViewerFromSession({
          googleUserId: typeof token.googleUserId === "string" ? token.googleUserId : null,
          email: session.user.email,
          name: session.user.name ?? null,
          image: typeof token.picture === "string" ? token.picture : session.user.image ?? null,
        });

        if (viewer && session.user) {
          session.user.id = viewer.id;
          session.user.isLinked = viewer.isLinked;
        }
      }

      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth } = NextAuth(authOptions);
