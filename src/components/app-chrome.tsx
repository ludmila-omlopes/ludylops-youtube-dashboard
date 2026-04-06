"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import { useEffect, useState } from "react";

import { AuthButtons } from "@/components/auth-buttons";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function AppChrome({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (mq.matches) {
        setMobileOpen(false);
      }
    };
    mq.addEventListener("change", onChange);
    onChange();
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const navLinks = [
    { href: "/resgates", label: "Resgates" },
    { href: "/apostas", label: "Apostas" },
    { href: "/jogos", label: "Jogos" },
    { href: "/ranking", label: "Ranking" },
  ];

  const authedLinks = [{ href: "/me", label: "Meus Pipetz" }];
  const adminLinks = session?.user?.email ? [{ href: "/admin", label: "Admin" }] : [];

  const allLinks = [...navLinks, ...(session?.user ? authedLinks : []), ...adminLinks];
  const showTicker = pathname === "/";

  const tickerText =
    "PIPETZ // GANHE ASSISTINDO // ENTRE NO POOL // RESGATE EFEITOS // SUBA NO RANKING // ";

  return (
    <div className="min-h-screen">
      <header
        className="sticky top-0 z-40 border-b-[3px] border-[var(--color-ink)]"
        style={{ background: "var(--color-header-surface)" }}
      >
        <div className="mx-auto flex w-full max-w-[1500px] items-center gap-4 px-4 py-3 sm:px-6 lg:px-10">
          <div className="shrink-0">
            <Link href="/" className="group flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius)] border-[3px] border-[var(--color-ink)] bg-[var(--color-pink)] text-lg font-bold text-[var(--color-accent-ink)] shadow-[4px_4px_0_#000] transition-transform group-hover:rotate-[-4deg]">
                Pz
              </div>
              <p
                className="text-xl font-bold uppercase text-[var(--color-ink)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Pipetz
              </p>
            </Link>
          </div>

          <div className="hidden flex-1 justify-center md:flex">
            <nav className="flex items-center gap-1">
              {allLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-[var(--radius)] border px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.1em] transition-colors duration-[var(--snap)] ${
                    pathname === link.href
                      ? "border-[2px] border-[var(--color-ink)] bg-[var(--color-purple)] text-[var(--color-ink)] shadow-[4px_4px_0_#000]"
                      : "border-transparent text-[var(--color-ink-soft)] hover:border-[var(--color-ink)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-3 md:justify-end">
            <ThemeToggle />
            <div className="hidden md:block">
              <AuthButtons />
            </div>
            <div className="shrink-0 md:hidden">
              <Button
                type="button"
                onClick={() => setMobileOpen(!mobileOpen)}
                variant="pink"
                size="sm"
                aria-label="Menu"
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? "Fechar" : "Menu"}
              </Button>
            </div>
          </div>
        </div>

        {mobileOpen ? (
          <div className="mobile-nav-enter border-t-[3px] border-[var(--color-ink)] bg-[var(--color-paper)] p-4 md:hidden">
            <nav className="flex flex-col gap-1.5" aria-label="Navegacao principal">
              {allLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-[var(--radius)] border px-4 py-3 text-sm font-extrabold uppercase tracking-[0.1em] transition-colors duration-[var(--snap)] ${
                    pathname === link.href
                      ? "border-[2px] border-[var(--color-ink)] bg-[var(--color-purple)] text-[var(--color-ink)] shadow-[4px_4px_0_#000]"
                      : "border-[2px] border-transparent text-[var(--color-ink-soft)] hover:border-[var(--color-ink)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)] active:border-[var(--color-ink)] active:bg-[var(--color-paper)] active:text-[var(--color-ink)]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mt-4 border-t-[2px] border-[var(--color-ink)] pt-4">
              <AuthButtons />
            </div>
          </div>
        ) : null}
      </header>

      {showTicker ? (
        <div className="marquee-strip" aria-hidden="true">
          <div className="marquee-inner">{tickerText.repeat(4)}</div>
        </div>
      ) : null}

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-30 bg-[var(--color-backdrop)] md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <main>{children}</main>
    </div>
  );
}
