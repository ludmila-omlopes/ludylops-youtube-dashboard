export const themeStorageKey = "pipetz-theme";
export const themeCookieKey = "pipetz-theme";
export const themeCookieMaxAge = 60 * 60 * 24 * 365;

export type ThemeMode = "light" | "dark";

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return value === "light" || value === "dark";
}

export function resolveThemePreference(
  storedTheme: string | null | undefined,
  prefersDark: boolean,
): ThemeMode {
  if (isThemeMode(storedTheme)) {
    return storedTheme;
  }

  return prefersDark ? "dark" : "light";
}

export function getThemeCookieValue(cookieHeader: string | null | undefined): ThemeMode | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [rawName, ...rawValue] = cookie.trim().split("=");
    if (rawName !== themeCookieKey) {
      continue;
    }

    const value = decodeURIComponent(rawValue.join("="));
    return isThemeMode(value) ? value : null;
  }

  return null;
}

export function buildThemeCookie(theme: ThemeMode) {
  return `${themeCookieKey}=${theme}; Path=/; Max-Age=${themeCookieMaxAge}; SameSite=Lax`;
}

export function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function getPreferredTheme(): ThemeMode {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return "light";
  }

  const rootTheme = document.documentElement.dataset.theme;
  if (isThemeMode(rootTheme)) {
    return rootTheme;
  }

  const storedTheme = window.localStorage.getItem(themeStorageKey);
  return resolveThemePreference(
    storedTheme,
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
}

export function persistTheme(theme: ThemeMode) {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(themeStorageKey, theme);
  document.cookie = buildThemeCookie(theme);
  applyTheme(theme);
}
