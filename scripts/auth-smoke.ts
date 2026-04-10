import { runAuthSmokeTest } from "../src/lib/auth/smoke";

function resolveBaseUrl() {
  const [, , cliBaseUrl] = process.argv;
  const baseUrl =
    cliBaseUrl ??
    process.env.AUTH_SMOKE_BASE_URL ??
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL;

  if (!baseUrl) {
    throw new Error(
      "Provide the deployed base URL as the first argument or set AUTH_SMOKE_BASE_URL, APP_URL, or NEXT_PUBLIC_APP_URL.",
    );
  }

  return baseUrl;
}

async function main() {
  const result = await runAuthSmokeTest({
    baseUrl: resolveBaseUrl(),
  });

  console.log(`[auth-smoke] Providers OK: ${result.providerIds.join(", ")}`);
  console.log(`[auth-smoke] Selected provider: ${result.selectedProviderId}`);
  console.log(`[auth-smoke] Providers URL: ${result.providersUrl}`);
  console.log(`[auth-smoke] Sign-in URL: ${result.signInUrl}`);
  console.log(`[auth-smoke] Sign-in status: ${result.signInStatus}`);

  if (result.signInRedirectLocation) {
    console.log(`[auth-smoke] Redirect location: ${result.signInRedirectLocation}`);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[auth-smoke] FAILED: ${message}`);
  process.exitCode = 1;
});
