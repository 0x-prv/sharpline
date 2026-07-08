import { Connection } from "@solana/web3.js";
import { walletKeypair } from "./wallet.js";
import { NETWORK_CONFIG } from "./config.js";

async function main() {
  const connection = new Connection(NETWORK_CONFIG.rpcUrl, "confirmed");
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log("Wallet address:", walletKeypair.publicKey.toBase58());
  console.log("TxLINE wallet balance (lamports):", balance);
}

main().catch(console.error);
