export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <svg
        className="pointer-events-none absolute inset-x-0 top-1/2 w-full -translate-y-1/2 opacity-[0.15]"
        height="120"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
      >
        <polyline
          points="0,60 150,58 280,62 400,55 480,80 520,20 560,90 620,50 750,52 900,48 1050,54 1200,50"
          fill="none"
          stroke="#37D67A"
          strokeWidth="1.5"
        />
      </svg>

      <div className="relative mx-auto max-w-6xl px-6 py-16">
        <p className="font-data text-xs uppercase tracking-widest text-signal-green">
          World Cup 2026 · TxLINE
        </p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl font-medium tracking-tight text-text">
          Autonomous sharp-money detection for World Cup markets.
        </h1>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-text-muted">
          Sharpline watches every live odds tick, flags statistically
          significant moves, and checks them against match events, so you
          know which moves are noise and which ones are signal.
        </p>
      </div>
    </section>
  );
}