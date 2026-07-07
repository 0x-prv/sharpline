"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/signals", label: "Signals" },
  { href: "/analytics", label: "Analytics" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label="SharpLine overview">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-signal-green/15">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M2 17L9 10L13 14L22 5" stroke="#37D67A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-display text-[15px] font-medium tracking-tight text-text">SharpLine</span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-1 rounded-full border border-border bg-surface p-1 sm:flex">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-3 py-1.5 text-xs transition ${active ? "bg-surface-hover text-text" : "text-text-muted hover:text-text"}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-signal-green" />
            <span className="font-data text-xs uppercase text-text-muted">Live</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
