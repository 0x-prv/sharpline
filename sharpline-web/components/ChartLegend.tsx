type ChartLegendItem = {
  color: string;
  label: string;
};

export function ChartLegend({ items, className = "" }: { items: ChartLegendItem[]; className?: string }) {
  if (items.length === 0) return null;

  return (
    <div className={`pointer-events-none absolute z-10 flex flex-wrap items-center gap-2 rounded-full border border-border/80 bg-bg/80 px-2 py-1 shadow-sm backdrop-blur ${className}`}>
      {items.map((item) => (
        <div key={`${item.color}:${item.label}`} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
          <span className="font-data text-[10px] uppercase tracking-[0.16em] text-text-muted">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
