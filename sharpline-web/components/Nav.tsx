export function Nav() {
  return (
    <nav className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-signal-green/15">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M2 17L9 10L13 14L22 5"
                stroke="#37D67A"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="font-display text-[15px] font-medium tracking-tight text-text">
            Sharpline
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-signal-green" />
          <span className="font-data text-xs text-text-muted">Live</span>
        </div>
      </div>
    </nav>
  );
}