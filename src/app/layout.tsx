import type { Metadata } from "next";
import { Archivo_Black, IBM_Plex_Mono, DM_Sans, Geist } from "next/font/google";
import Script from "next/script";

import { auth } from "@/auth";
import { AppChrome } from "@/components/app-chrome";
import { Providers } from "@/components/providers";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const display = Archivo_Black({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

const body = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Pipetz",
  description: "Ganhe pipetz na live, resgate recompensas, aposte em desafios e sugira jogos.",
};

const themeScript = `
(() => {
  const storageKey = "pipetz-theme";
  const root = document.documentElement;
  const storedTheme = window.localStorage.getItem(storageKey);
  const theme =
    storedTheme === "dark" || storedTheme === "light"
      ? storedTheme
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

  root.dataset.theme = theme;
  root.style.colorScheme = theme;
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", display.variable, body.variable, mono.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-full text-[var(--color-ink)]" style={{ fontFamily: "var(--font-body), var(--font-display), sans-serif" }}>
        <Script id="pipetz-theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <Providers>
          <AppChrome session={session}>{children}</AppChrome>
        </Providers>
      </body>
    </html>
  );
}
