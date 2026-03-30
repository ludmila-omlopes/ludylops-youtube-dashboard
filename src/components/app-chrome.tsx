"use client";

import Link from "next/link";
import type { Session } from "next-auth";
import { useState } from "react";

import { AuthButtons } from "@/components/auth-buttons";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppChrome({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: "/resgates", label: "Resgates" },
    { href: "/apostas", label: "Apostas" },
    { href: "/jogos", label: "Jogos" },
    { href: "/ranking", label: "Ranking" },
  ];

  const authedLinks = [{ href: "/me", label: "Meus Pipetz" }];
  const adminLinks = session?.user?.email ? [{ href: "/admin", label: "Admin" }] : [];

  const allLinks = [...navLinks, ...(session?.user ? authedLinks : []), ...adminLinks];

  const tickerText =
    "PIPETZ ★ GANHE ASSISTINDO A LIVE ★ RESGATE RECOMPENSAS ★ APOSTE NOS DESAFIOS ★ SUGIRA JOGOS ★ ";

  return (
    <div className="min-h-screen">
      <header
        className="sticky top-0 z-40 border-b-[3px] border-[var(--color-ink)]"
        style={{ background: "var(--color-header-surface)" }}
      >
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius)] border-[3px] border-[var(--color-ink)] bg-[var(--color-yellow)] text-lg font-bold text-[var(--color-ink)] shadow-[3px_3px_0_var(--shadow-color)] transition-transform group-hover:rotate-[-4deg]">
              Pz
            </div>
            <p
              className="text-xl font-bold uppercase text-[var(--color-ink)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Pipetz
            </p>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {allLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-[var(--radius)] border-[2px] border-transparent px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--color-ink)] transition-all duration-[var(--snap)] hover:border-[var(--color-ink)] hover:bg-[var(--color-paper)] hover:shadow-[3px_3px_0_var(--shadow-soft-color)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden sm:block">
              <AuthButtons />
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="btn-brutal bg-[var(--color-yellow)] px-3 py-2 text-lg md:hidden"
              aria-label="Menu"
            >
              {mobileOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="mobile-nav-enter border-t-[3px] border-[var(--color-ink)] bg-[var(--color-paper)] p-4 md:hidden">
            <nav className="flex flex-col gap-2">
              {allLinks.map((link, i) => {
                const colors = [
                  "bg-[var(--color-lavender)]",
                  "bg-[var(--color-rose)]",
                  "bg-[var(--color-sky)]",
                  "bg-[var(--color-yellow)]",
                  "bg-[var(--color-mint)]",
                  "bg-[var(--color-periwinkle)]",
                ];
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`rounded-[var(--radius)] border-[3px] border-[var(--color-ink)] px-4 py-3 text-sm font-bold uppercase tracking-[0.1em] shadow-[3px_3px_0_var(--shadow-color)] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none ${colors[i % colors.length]}`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-4">
              <AuthButtons />
            </div>
          </div>
        ) : null}
      </header>

      <div className="marquee-strip" aria-hidden="true">
        <div className="marquee-inner">{tickerText.repeat(4)}</div>
      </div>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-30 bg-[var(--color-backdrop)] backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <main>{children}</main>
    </div>
  );
}
