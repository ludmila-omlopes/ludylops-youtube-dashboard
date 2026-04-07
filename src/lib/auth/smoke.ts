export type AuthSmokeResult = {
  providerIds: string[];
  selectedProviderId: string;
  providersUrl: string;
  signInUrl: string;
  signInStatus: number;
  signInRedirectLocation: string | null;
};

type ProviderMap = Record<string, { id?: string; name?: string }>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function assertProviderMap(value: unknown): ProviderMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Auth providers endpoint did not return an object.");
  }

  return value as ProviderMap;
}

export function pickAuthSmokeProvider(providerIds: string[]) {
  if (providerIds.includes("google")) {
    return "google";
  }

  if (providerIds.includes("credentials")) {
    return "credentials";
  }

  const firstProvider = providerIds[0];
  if (!firstProvider) {
    throw new Error("Auth providers endpoint returned no configured providers.");
  }

  return firstProvider;
}

export function isHealthySignInStartResponse(providerId: string, response: Response) {
  const isRedirect = [302, 303, 307, 308].includes(response.status);
  const location = response.headers.get("location");

  if (providerId === "credentials") {
    return response.status >= 200 && response.status < 400 && (!isRedirect || Boolean(location));
  }

  return isRedirect && Boolean(location);
}

export async function runAuthSmokeTest(input: {
  baseUrl: string;
  fetchFn?: FetchLike;
}): Promise<AuthSmokeResult> {
  const fetchFn = input.fetchFn ?? fetch;
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  const providersUrl = `${baseUrl}/api/auth/providers`;
  const providersResponse = await fetchFn(providersUrl, {
    headers: {
      accept: "application/json",
      "user-agent": "lojinha-auth-smoke/1.0",
    },
    redirect: "manual",
  });

  if (!providersResponse.ok) {
    throw new Error(`Auth providers endpoint failed with status ${providersResponse.status}.`);
  }

  const providers = assertProviderMap(await providersResponse.json());
  const providerIds = Object.keys(providers);
  const selectedProviderId = pickAuthSmokeProvider(providerIds);
  const signInUrl = `${baseUrl}/api/auth/signin/${selectedProviderId}?callbackUrl=${encodeURIComponent("/")}`;
  const signInResponse = await fetchFn(signInUrl, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "lojinha-auth-smoke/1.0",
    },
    redirect: "manual",
  });

  if (!isHealthySignInStartResponse(selectedProviderId, signInResponse)) {
    throw new Error(
      `Sign-in start path for ${selectedProviderId} returned an unexpected response (${signInResponse.status}).`,
    );
  }

  return {
    providerIds,
    selectedProviderId,
    providersUrl,
    signInUrl,
    signInStatus: signInResponse.status,
    signInRedirectLocation: signInResponse.headers.get("location"),
  };
}
