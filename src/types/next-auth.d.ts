import type { DefaultSession } from "next-auth";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      id?: string;
      googleAccountId?: string;
      isLinked?: boolean;
      activeViewerId?: string;
      activeYoutubeChannelId?: string;
      activeViewerDisplayName?: string;
      youtubeLinkingStatus?:
        | "channels_found"
        | "empty"
        | "scope_missing"
        | "authorization_required"
        | "insufficient_permissions"
        | "http_error"
        | "network_error";
      youtubeLinkingMessage?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    googleUserId?: string;
    googleAccountId?: string;
    activeViewerId?: string;
    activeYoutubeChannelId?: string;
    activeViewerDisplayName?: string;
    isLinked?: boolean;
    youtubeLinkingStatus?:
      | "channels_found"
      | "empty"
      | "scope_missing"
      | "authorization_required"
      | "insufficient_permissions"
      | "http_error"
      | "network_error";
    youtubeLinkingMessage?: string;
  }
}
