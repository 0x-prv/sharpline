import { PublicKey } from "@solana/web3.js";

export type TxlineNetwork = "mainnet" | "devnet";

const configuredNetwork = process.env.TXLINE_NETWORK ?? "mainnet";

if (configuredNetwork !== "mainnet" && configuredNetwork !== "devnet") {
  throw new Error(`Invalid TXLINE_NETWORK "${configuredNetwork}". Expected "mainnet" or "devnet".`);
}

export const NETWORK: TxlineNetwork = configuredNetwork;

export const CONFIG = {
  mainnet: {
    rpcUrl: "https://api.mainnet-beta.solana.com",
    apiOrigin: "https://txline.txodds.com",
    programId: new PublicKey("9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA"),
    txlTokenMint: new PublicKey("Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL"),
  },
  devnet: {
    rpcUrl: "https://api.devnet.solana.com",
    apiOrigin: "https://txline-dev.txodds.com",
    programId: new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J"),
    txlTokenMint: new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG"),
  },
} as const;

export const NETWORK_CONFIG = CONFIG[NETWORK];
export const API_BASE_URL = `${NETWORK_CONFIG.apiOrigin}/api`;

// World Cup free tier — no TxL payment required
export const SERVICE_LEVEL = {
  WORLD_CUP_DELAYED: 1, // 60-second delay, mainnet + devnet
  WORLD_CUP_REALTIME: 12, // real-time, mainnet only
} as const;