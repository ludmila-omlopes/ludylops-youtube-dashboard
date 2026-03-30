import Link from "next/link";

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
        <Link
          key={item.href}
          href={item.href}
          className={`card-brutal group relative overflow-hidden p-5 ${item.bg} ${item.shadow ?? ""}`}
        >
          {/* Emoji grande decorativo */}
          {item.emoji ? (
            <span className="pointer-events-none absolute -bottom-2 -right-2 text-5xl opacity-20 transition-transform duration-300 group-hover:scale-125 group-hover:opacity-30">
              {item.emoji}
            </span>
          ) : null}

          <p className="mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-muted)]">
            {item.sublabel}
          </p>
          <p
            className="mt-1 text-2xl font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {item.value}
          </p>
          <p className="mt-2 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-ink)]">
            {item.emoji ? <span className="mr-1">{item.emoji}</span> : null}
            {item.label} →
          </p>
        </Link>
      ))}
    </div>
  );
}
