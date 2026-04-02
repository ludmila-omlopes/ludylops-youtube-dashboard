import type { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { ensureViewerFromSession, getSessionViewerState } from "@/lib/db/repository";
import { authSecret, env, isDemoAuthEnabled } from "@/lib/env";
import { getYoutubeChannelFromGoogleAccessToken } from "@/lib/google/youtube-channel";

const providers = [];

if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/youtube.readonly",
          ].join(" "),
        },
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
          const youtubeChannels =
            account?.provider === "google" && typeof account.access_token === "string"
              ? await getYoutubeChannelFromGoogleAccessToken(account.access_token)
              : null;

          await ensureViewerFromSession({
            googleUserId,
            email,
            name,
            image,
            youtubeChannels,
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
      }

      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth } = NextAuth(authOptions);
