import { env, isDemoAuthEnabled, isProduction } from "@/lib/env";

export type PublicAuthHealth = {
  ready: boolean;
  status: "ready" | "degraded";
  availableProviders: string[];
  googleOAuthConfigured: boolean;
  demoAuthEnabled: boolean;
  nextAuthSecretConfigured: boolean;
  usesFallbackSecret: boolean;
  failures: string[];
  warnings: string[];
};

export function getPublicAuthHealth(): PublicAuthHealth {
  const googleOAuthConfigured = Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
  const googleOAuthPartialConfig = Boolean(env.AUTH_GOOGLE_ID || env.AUTH_GOOGLE_SECRET) && !googleOAuthConfigured;
  const nextAuthSecretConfigured = Boolean(env.NEXTAUTH_SECRET);
  const availableProviders = [
    ...(googleOAuthConfigured ? ["google"] : []),
    ...(isDemoAuthEnabled ? ["credentials"] : []),
  ];

  const failures = [
    ...(googleOAuthPartialConfig ? ["google_oauth_partial_config"] : []),
    ...(availableProviders.length === 0 ? ["no_auth_provider_configured"] : []),
  ];
  const warnings = [
    ...(isProduction && !nextAuthSecretConfigured ? ["nextauth_secret_missing_using_fallback"] : []),
  ];

  return {
    ready: failures.length === 0,
    status: failures.length === 0 ? "ready" : "degraded",
    availableProviders,
    googleOAuthConfigured,
    demoAuthEnabled: isDemoAuthEnabled,
    nextAuthSecretConfigured,
    usesFallbackSecret: !nextAuthSecretConfigured,
    failures,
    warnings,
  };
}
