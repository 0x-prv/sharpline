import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { createHash } from "crypto";
import { NETWORK_CONFIG } from "../txline/config.js";
import { walletKeypair } from "../txline/wallet.js";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

const connection = new Connection(NETWORK_CONFIG.rpcUrl, "confirmed");

export type ResolvedSignalForAnchor = {
  id: string;
  fixture_id: string;
  market: string;
  selection: string;
  price_before: number;
  price_after: number;
  pct_change: number;
  classification: string;
  confidence: number;
  outcome: "won" | "lost" | "push";
};

function computeIntegrityHash(signal: ResolvedSignalForAnchor): string {
  const canonical = [
    signal.id,
    signal.fixture_id,
    signal.market,
    signal.selection,
    signal.price_before,
    signal.price_after,
    signal.classification,
    signal.outcome,
  ].join("|");

  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}

function buildMemoText(signal: ResolvedSignalForAnchor): string {
  const hash = computeIntegrityHash(signal);
  return (
    `SHARPLINE|fixture:${signal.fixture_id}|market:${signal.market}|` +
    `sel:${signal.selection}|${signal.price_before}->${signal.price_after}|` +
    `${signal.classification}|conf:${signal.confidence.toFixed(0)}%|` +
    `outcome:${signal.outcome}|hash:${hash}`
  );
}

/**
 * Anchors a resolved signal on-chain via the Solana Memo Program.
 * Returns the transaction signature, or null if the send failed
 * (failures are logged but never crash the caller — anchoring is
 * best-effort and must not block the resolver pipeline).
 */
export async function anchorSignalOnChain(
  signal: ResolvedSignalForAnchor
): Promise<string | null> {
  try {
    const memoText = buildMemoText(signal);

    const instruction = new TransactionInstruction({
      keys: [{ pubkey: walletKeypair.publicKey, isSigner: true, isWritable: true }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memoText, "utf-8"),
    });

    const transaction = new Transaction().add(instruction);
    const signature = await connection.sendTransaction(transaction, [walletKeypair], {
      skipPreflight: false,
    });

    await connection.confirmTransaction(signature, "confirmed");

    console.log(`[anchor] tx confirmed: https://explorer.solana.com/tx/${signature}`);
    return signature;
  } catch (err: any) {
    console.error(`[anchor] failed for signal ${signal.id}:`, err?.message ?? err);
    return null;
  }
}