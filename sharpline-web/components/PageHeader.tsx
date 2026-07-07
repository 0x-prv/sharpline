import type { LucideIcon } from "lucide-react";

export function PageHeader({ eyebrow, title, description, icon: Icon }: { eyebrow: string; title: string; description: string; icon?: LucideIcon }) {
  return (
    <section className="border-b border-border bg-bg">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex max-w-3xl items-start gap-4">
          {Icon && <div className="rounded-2xl border border-border bg-surface p-3"><Icon className="h-5 w-5 text-signal-blue" /></div>}
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-text-muted">{eyebrow}</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-text">{title}</h1>
            <p className="mt-4 text-base leading-7 text-text-muted">{description}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
