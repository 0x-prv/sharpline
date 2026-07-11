import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import axios from "axios";
import nacl from "tweetnacl";
import { walletKeypair } from "./wallet.js";
import { NETWORK, NETWORK_CONFIG, API_BASE_URL, SERVICE_LEVEL } from "./config.js";
import idl from "./idl.json" with { type: "json" };

const connection = new Connection(NETWORK_CONFIG.rpcUrl, "confirmed");
const wallet = new Wallet(walletKeypair);
const provider = new AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});

const program = new Program(idl as anchor.Idl, provider);

export function getSelectedWorldCupServiceLevel() {
  if (NETWORK === "mainnet") {
    return {
      network: NETWORK,
      serviceLevelId: SERVICE_LEVEL.WORLD_CUP_REALTIME,
      delay: "real-time" as const,
    };
  }

  return {
    network: NETWORK,
    serviceLevelId: SERVICE_LEVEL.WORLD_CUP_DELAYED,
    delay: "60-second" as const,
  };
}

function derivePdas() {
  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pricing_matrix")],
    NETWORK_CONFIG.programId
  );
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_treasury_v2")],
    NETWORK_CONFIG.programId
  );
  return { pricingMatrixPda, tokenTreasuryPda };
}

export async function subscribeFreeWorldCupTier(): Promise<string> {
  const { pricingMatrixPda, tokenTreasuryPda } = derivePdas();

  const tokenTreasuryVault = getAssociatedTokenAddressSync(
    NETWORK_CONFIG.txlTokenMint,
    tokenTreasuryPda,
    true,
    TOKEN_2022_PROGRAM_ID
  );

  const userTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    walletKeypair,
    NETWORK_CONFIG.txlTokenMint,
    walletKeypair.publicKey,
    false,
    "confirmed",
    undefined,
    TOKEN_2022_PROGRAM_ID
  );

  const DURATION_WEEKS = 4; // must be a multiple of 4 per program rules
  const selectedServiceLevel = getSelectedWorldCupServiceLevel();

  const txSig = await program.methods
    .subscribe(selectedServiceLevel.serviceLevelId, DURATION_WEEKS)
    .accounts({
      user: walletKeypair.publicKey,
      pricingMatrix: pricingMatrixPda,
      tokenMint: NETWORK_CONFIG.txlTokenMint,
      userTokenAccount: userTokenAccount.address,
      tokenTreasuryVault,
      tokenTreasuryPda,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .rpc();

  return txSig;
}

export async function getGuestJwt(): Promise<string> {
  const res = await axios.post(`${NETWORK_CONFIG.apiOrigin}/auth/guest/start`);
  return res.data.token;
}

export async function activateApiToken(
  txSig: string,
  jwt: string,
  leagues: number[] = []
): Promise<string> {
  const messageString = `${txSig}:${leagues.join(",")}:${jwt}`;
  const message = new TextEncoder().encode(messageString);
  const signatureBytes = nacl.sign.detached(message, walletKeypair.secretKey);
  const walletSignature = Buffer.from(signatureBytes).toString("base64");

  const res = await axios.post(
    `${API_BASE_URL}/token/activate`,
    { txSig, walletSignature, leagues },
    { headers: { Authorization: `Bearer ${jwt}` } }
  );

  return res.data.token || res.data;
}