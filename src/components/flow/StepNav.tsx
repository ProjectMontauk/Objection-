"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const STEPS = [
  { href: "/flow/recording", label: "1 · MP4", short: "1" },
  { href: "/flow/article", label: "2 · Article", short: "2" },
  { href: "/flow/analysis", label: "3 · AI", short: "3" },
  { href: "/flow/score", label: "4 · Score", short: "4" },
] as const;

export function StepNav() {
  const pathname = usePathname();

  return (
    <nav
      className="border-b border-rule bg-field-muted px-4 py-3 sm:px-6"
      aria-label="Verification steps"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="shrink-0 border border-rule px-3 py-1.5 font-sans text-[0.65rem] font-semibold uppercase tracking-wide text-ink-muted transition hover:border-ink-muted hover:text-ink sm:text-xs"
        >
          Homepage
        </Link>
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-2 sm:gap-4">
          {STEPS.map((s) => {
            const active = pathname === s.href;
            return (
              <Link
                key={s.href}
                href={s.href}
                className={`border px-3 py-1.5 font-sans text-[0.65rem] font-semibold uppercase tracking-wide transition sm:text-xs ${
                  active
                    ? "border-wip-navy bg-field text-wip-navy"
                    : "border-rule text-ink-muted hover:border-ink-muted hover:text-ink"
                }`}
              >
                <span className="sm:hidden">{s.short}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
