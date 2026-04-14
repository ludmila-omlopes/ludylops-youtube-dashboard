export const GOOGLE_REQUIRED_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/youtube.readonly",
] as const;

export const GOOGLE_AUTHORIZATION_PARAMS = {
  prompt: "select_account",
  scope: GOOGLE_REQUIRED_SCOPES.join(" "),
} as const;

export const GOOGLE_REAUTHORIZATION_PARAMS = {
  ...GOOGLE_AUTHORIZATION_PARAMS,
  prompt: "consent select_account",
} as const;

export const GOOGLE_ACCOUNT_SWITCH_HINT =
  "Na proxima etapa, voce pode escolher outra conta sem limpar a sessao do navegador.";
