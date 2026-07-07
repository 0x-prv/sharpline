import Link from "next/link";
import { BarChart3, Radio } from "lucide-react";

const CARDS = [
  { href: "/signals", title: "Live Intelligence", body: "Review the latest autonomous decisions, odds movement, and AI explanations.", icon: Radio },
  { href: "/analytics", title: "Historical Performance", body: "Track accuracy, resolved signals, strategy performance, and agent statistics.", icon: BarChart3 },
];

export function QuickNavCards() {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {CARDS.map(({ href, title, body, icon: Icon }) => (
        <Link key={href} href={href} className="rounded-2xl border border-border bg-surface p-6 transition hover:border-signal-blue/40 hover:bg-surface-hover">
          <Icon className="h-5 w-5 text-signal-blue" />
          <h2 className="mt-5 font-display text-2xl font-semibold text-text">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">{body}</p>
          <p className="mt-5 text-xs uppercase tracking-[0.2em] text-signal-green">Open →</p>
        </Link>
      ))}
    </section>
  );
}
