import type { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { GOOGLE_AUTHORIZATION_PARAMS, GOOGLE_SECURE_OAUTH_CHECKS } from "@/lib/auth/google";
import { ensureViewerFromSession, getGoogleAccountByIdentity, getSessionViewerState } from "@/lib/db/repository";
import { authSecret, env, isDemoAuthEnabled } from "@/lib/env";
import type { GoogleAccountRecord } from "@/lib/types";

const providers = [];

if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      checks: [...GOOGLE_SECURE_OAUTH_CHECKS],
      authorization: {
        params: GOOGLE_AUTHORIZATION_PARAMS,
      },
    }),
  );
}

if (isDemoAuthEnabled) {
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

function getGoogleAccountProtectionStatus(input: {
  googleAccount: GoogleAccountRecord | null;
  tokenIssuedAt?: number;
}) {
  if (!input.googleAccount) {
    return null;
  }

  if (input.googleAccount.crossAccountProtectionState === "google_signin_blocked") {
    return "google_signin_blocked" as const;
  }

  if (
    typeof input.tokenIssuedAt === "number" &&
    input.googleAccount.sessionsRevokedAt &&
    Date.parse(input.googleAccount.sessionsRevokedAt) > input.tokenIssuedAt * 1000
  ) {
    return "session_revoked" as const;
  }

  return null;
}

function clearGoogleSessionToken(token: Record<string, unknown>, protectionStatus: "google_signin_blocked" | "session_revoked") {
  token.accountProtectionStatus = protectionStatus;
  delete token.email;
  delete token.name;
  delete token.picture;
  delete token.sub;
  delete token.googleUserId;
  delete token.googleAccountId;
  delete token.activeViewerId;
  delete token.activeYoutubeChannelId;
  delete token.activeViewerDisplayName;
  delete token.isLinked;
  return token;
}

export const authOptions = {
  secret: authSecret,
  providers,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async signIn({ account, user }) {
      if (account?.provider !== "google") {
        return true;
      }

      const existingAccount = await getGoogleAccountByIdentity({
        googleUserId: account.providerAccountId ?? null,
        email: user.email ?? null,
      });

      if (existingAccount?.crossAccountProtectionState === "google_signin_blocked") {
        return "/?googleAccountProtection=blocked";
      }

      return true;
    },
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
      const email = typeof token.email === "string" ? token.email : null;
      const googleUserId = typeof token.googleUserId === "string" ? token.googleUserId : null;
      const name =
        typeof user?.name === "string"
          ? user.name
          : typeof token.name === "string"
            ? token.name
            : null;
      const image =
        typeof token.picture === "string"
          ? token.picture
          : typeof user?.image === "string"
            ? user.image
            : null;

      if (email) {
        const shouldBootstrapSession = Boolean(account || user);
        if (shouldBootstrapSession) {
          await ensureViewerFromSession({
            googleUserId,
            email,
            name,
            image,
          });
        }

        let sessionState = await getSessionViewerState({
          googleUserId,
          email,
        });
        if (!sessionState) {
          await ensureViewerFromSession({
            googleUserId,
            email,
            name,
            image,
          });
          sessionState = await getSessionViewerState({
            googleUserId,
            email,
          });
        }

        const protectionStatus = getGoogleAccountProtectionStatus({
          googleAccount: sessionState?.googleAccount ?? null,
          tokenIssuedAt: typeof token.iat === "number" ? token.iat : undefined,
        });
        if (protectionStatus) {
          return clearGoogleSessionToken(token as Record<string, unknown>, protectionStatus);
        }

        token.accountProtectionStatus = undefined;
        token.googleAccountId = sessionState?.googleAccount.id;
        token.activeViewerId = sessionState?.activeViewer.id;
        token.activeYoutubeChannelId = sessionState?.activeViewer.youtubeChannelId;
        token.activeViewerDisplayName = sessionState?.activeViewer.youtubeDisplayName;
        token.isLinked = sessionState?.activeViewer.isLinked;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.activeViewerId === "string") {
          session.user.id = token.activeViewerId;
          session.user.activeViewerId = token.activeViewerId;
        }
        if (typeof token.googleAccountId === "string") {
          session.user.googleAccountId = token.googleAccountId;
        }
        if (typeof token.activeYoutubeChannelId === "string") {
          session.user.activeYoutubeChannelId = token.activeYoutubeChannelId;
        }
        if (typeof token.activeViewerDisplayName === "string") {
          session.user.activeViewerDisplayName = token.activeViewerDisplayName;
        }
        if (typeof token.isLinked === "boolean") {
          session.user.isLinked = token.isLinked;
        }
        if (token.accountProtectionStatus === "google_signin_blocked" || token.accountProtectionStatus === "session_revoked") {
          session.user.accountProtectionStatus = token.accountProtectionStatus;
        }
      }

      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth } = NextAuth(authOptions);
