import { CheckCircle2, ExternalLink, Link } from "lucide-react";
import type { AnchorLedgerEntry } from "../lib/queries";

const SOLANA_CLUSTER = process.env.NEXT_PUBLIC_TXLINE_NETWORK === "devnet" ? "devnet" : "mainnet";

function solanaTxUrl(signature: string) {
  return `https://explorer.solana.com/tx/${signature}?cluster=${SOLANA_CLUSTER}`;
}

function truncateSignature(signature: string) {
  return signature.length <= 10 ? signature : `${signature.slice(0, 6)}...${signature.slice(-4)}`;
}

function anchoredDescription(entry: AnchorLedgerEntry) {
  const match = entry.match?.trim() || "Signal record";
  const action = entry.action?.trim() || "WATCH";
  return `${match} — ${action.toUpperCase()} signal`;
}

export function OnChainAnchorLedger({ entries }: { entries: AnchorLedgerEntry[] }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link className="h-5 w-5 text-signal-blue" aria-hidden="true" />
            <h2 className="font-display text-xl font-bold text-text">On-Chain Anchor Ledger</h2>
          </div>
          <p className="mt-2 text-sm text-text-muted">Every signal is permanently anchored on Solana for tamper-proof verification.</p>
        </div>
      </div>

      <div className="mt-4 max-h-80 overflow-y-auto rounded-lg border border-border bg-bg/50" aria-live="polite">
        {entries.length === 0 ? (
          <div className="flex min-h-36 items-center justify-center px-4 text-center text-sm text-text-muted">
            No anchored signals yet — anchors will appear as SharpLine detects and confirms signals on-chain.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {entries.map((entry) => (
              <div key={`${entry.id}-${entry.anchor_tx_signature}`} className="grid min-h-16 grid-cols-[auto_minmax(7rem,0.9fr)_minmax(0,1.6fr)_auto_auto] items-center gap-3 px-4 py-3 text-sm">
                <span className="rounded-full border border-signal-blue/30 bg-signal-blue/10 px-2.5 py-1 font-data text-[10px] font-semibold uppercase tracking-[0.16em] text-signal-blue">ANCHOR</span>
                <span className="font-data text-xs text-text" title={entry.anchor_tx_signature}>{truncateSignature(entry.anchor_tx_signature)}</span>
                <span className="truncate text-text-muted" title={anchoredDescription(entry)}>{anchoredDescription(entry)}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-signal-green/30 bg-signal-green/10 px-2.5 py-1 text-xs font-semibold text-signal-green">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Confirmed
                </span>
                <a href={solanaTxUrl(entry.anchor_tx_signature)} target="_blank" rel="noreferrer" aria-label={`Open Solana explorer transaction ${truncateSignature(entry.anchor_tx_signature)}`} className="rounded-full border border-border p-2 text-text-muted transition hover:border-signal-blue/50 hover:text-signal-blue">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
