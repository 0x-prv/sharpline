import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import "dotenv/config";

function loadKeypair(): Keypair {
  const raw = process.env.SOLANA_PRIVATE_KEY;
  if (!raw) {
    throw new Error("Missing SOLANA_PRIVATE_KEY in .env");
  }

  const trimmed = raw.trim();

  // Format 1: JSON array, e.g. "[12,34,...]"
  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(parsed));
  }

  // Format 2: base58 string (typical Solana CLI export / Phantom export)
  return Keypair.fromSecretKey(bs58.decode(trimmed));
}

export const walletKeypair = loadKeypair();