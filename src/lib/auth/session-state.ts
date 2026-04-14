import type { Session } from "next-auth";

export type AccountProtectionStatus = "google_signin_blocked" | "session_revoked";

type SearchParamsLike = {
  googleAccountProtection?: string | string[] | undefined;
};

function firstValue(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}

export function getAccountProtectionStatusFromSearchParams(
  searchParams?: SearchParamsLike | null,
): AccountProtectionStatus | null {
  const value = firstValue(searchParams?.googleAccountProtection);
  if (value === "blocked") {
    return "google_signin_blocked";
  }

  if (value === "revoked") {
    return "session_revoked";
  }

  return null;
}

export function getSessionAccountProtectionStatus(session: Session | null | undefined) {
  return session?.user?.accountProtectionStatus ?? null;
}

export function hasUsableAppSession(session: Session | null | undefined) {
  return Boolean(session?.user?.email && !getSessionAccountProtectionStatus(session));
}
