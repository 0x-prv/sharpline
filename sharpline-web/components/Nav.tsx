"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, Command, GitBranch, LayoutDashboard, Radio, Search } from "lucide-react";

const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/signals", label: "Signals", icon: Radio },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/bracket", label: "Bracket", icon: GitBranch },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="Sharpline dashboard">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card shadow-lg shadow-black/20">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 16.5L8.5 11L12.5 15L21 6.5" stroke="#22C55E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 6.5H21V12.5" stroke="#3B82F6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="leading-none">
            <span className="block text-[15px] font-semibold tracking-tight text-text">Sharpline</span>
            <span className="hidden font-data text-[10px] uppercase tracking-[.16em] text-text-muted sm:block">World Cup OS</span>
          </div>
        </Link>

        <div className="hidden min-w-[280px] max-w-md flex-1 items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-text-muted md:flex">
          <Search className="h-4 w-4" />
          <span className="text-sm">Search fixtures, signals, match narratives</span>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-border bg-bg px-2 py-0.5 font-data text-[10px]"><Command className="h-3 w-3" />K</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center rounded-full border border-border bg-surface p-1 sm:flex">
            {LINKS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href} className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[13px] ${active ? "bg-card text-text shadow-sm" : "text-text-muted hover:text-text"}`}>
                  <Icon className="h-3.5 w-3.5" />{label}
                </Link>
              );
            })}
          </div>
          <button className="hidden h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-text-muted hover:bg-card hover:text-text sm:flex" aria-label="Alerts"><Bell className="h-4 w-4" /></button>
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal-green opacity-50" /><span className="relative inline-flex h-2 w-2 rounded-full bg-signal-green" /></span>
            <span className="font-data text-[11px] uppercase text-text-muted">TxLINE Live</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
