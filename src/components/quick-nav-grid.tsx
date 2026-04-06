import Link from "next/link";

import { Card, CardContent, CardFooter } from "@/components/ui/card";

interface NavItem {
  href: string;
  label: string;
  value: string | number;
  sublabel: string;
  emoji?: string;
  bg: string;
  shadow?: string;
}

export function QuickNavGrid({ items }: { items: NavItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className="block h-full">
          <Card
            variant="brutal"
            className={`group h-full justify-between gap-6 overflow-hidden p-5 ${item.bg} ${item.shadow ?? ""}`}
          >
            <CardContent className="flex items-start justify-between gap-3">
              <div className="card-brutal flex h-12 w-12 items-center justify-center bg-[var(--color-paper)] px-2 text-[11px] font-black uppercase tracking-[0.16em]">
                {item.emoji ?? "GO"}
              </div>
              <p className="mono text-right text-[10px] uppercase tracking-[0.28em] text-[var(--color-ink-soft)]">
                {item.sublabel}
              </p>
            </CardContent>

            <CardFooter className="block">
              <p
                className="text-3xl uppercase leading-none"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {item.value}
              </p>
              <p className="mt-3 text-sm font-black uppercase tracking-[0.1em]">
                {`${item.label} ->`}
              </p>
            </CardFooter>
          </Card>
        </Link>
      ))}
    </div>
  );
}
