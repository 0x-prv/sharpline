> ## Documentation Index
> Fetch the complete documentation index at: https://txline-docs.txodds.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Quickstart

> Get started with the TxLINE API in minutes

## Overview

TxLINE provides cryptographically verifiable sports data through a hybrid Solana on-chain and TxODDS off-chain system. Access fixtures, odds, and scores with time-limited API tokens secured by on-chain subscriptions.

***

## Getting Started

<Info>
  **Want to try for free?** Check out our [World Cup Free Tier](/documentation/worldcup) for instant access to World Cup and International Friendlies data with no payment required.
</Info>

Choose the path that matches your use case:

* **Free World Cup path**: Follow the [World Cup Free Tier](/documentation/worldcup) guide for service levels 1 or 12. No TxL purchase is required.
* **Paid subscription path**: Continue below to purchase TxL if needed, subscribe on-chain, and activate an API token.

## Select Your Network

Pick one network and use it consistently for every step. The Solana RPC, program ID, TxL mint, guest JWT, and activation endpoint must all be on the same network.

```typescript theme={null}
import * as anchor from "@coral-xyz/anchor";
import type { Txoracle } from "./types/txoracle"; // Use the matching mainnet/devnet type
import txoracleIdl from "./idl/txoracle.json"; // Use the matching mainnet/devnet IDL
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import axios from "axios";
import nacl from "tweetnacl";

const NETWORK: "mainnet" | "devnet" = "mainnet";

const CONFIG = {
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

const { rpcUrl, apiOrigin, programId, txlTokenMint } = CONFIG[NETWORK];
const apiBaseUrl = `${apiOrigin}/api`;

const connection = new Connection(rpcUrl, "confirmed");
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});
anchor.setProvider(provider);

const program = new anchor.Program<Txoracle>(
  txoracleIdl as Txoracle,
  provider
);

if (!program.programId.equals(programId)) {
  throw new Error(
    `Loaded IDL program ${program.programId.toBase58()} does not match ${NETWORK} program ${programId.toBase58()}`
  );
}
```

<Warning>
  Do not activate a devnet transaction on `https://txline.txodds.com`, and do not activate a mainnet transaction on `https://txline-dev.txodds.com`. Use the matching `apiOrigin` from the selected network.
</Warning>

## Purchase TxL (Optional)

<Info>
  **Note**: Purchasing TxL tokens is optional. We offer [free tiers for World Cup and International Friendlies](/documentation/worldcup) data with no payment required. View all [subscription tiers](/documentation/subscription-tiers) to see free and premium options.
</Info>

In order to purchase TxL, your wallet will need to be funded with USDT. If you don't have USDT on Solana, you can swap for it using [Jupiter](https://jup.ag/) or another exchange.

TxL purchases use a 2-step process: request a quote from the backend, then verify and sign the transaction locally.

### Step 1: Request Purchase Quote

```typescript theme={null}
// Get guest JWT
const authResponse = await axios.post(`${apiOrigin}/auth/guest/start`);
const jwt = authResponse.data.token;

// Request purchase quote
const txlineAmount = 50; // Amount of TxL tokens to purchase

const quoteResponse = await fetch(`${apiBaseUrl}/guest/purchase/quote`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${jwt}`
  },
  body: JSON.stringify({
    buyerPubkey: wallet.publicKey.toBase58(),
    txlineAmount: txlineAmount
  })
});

const quoteData = await quoteResponse.json();
console.log(`Base Cost: ${quoteData.baseUsdtCost} USDT`);
console.log(`Premium Fee: ${quoteData.feeUsdtAmount} USDT`);
console.log(`Total: ${quoteData.totalUsdtCharged} USDT`);
```

### Step 2: Verify and Sign Transaction

```typescript theme={null}
// Deserialize the transaction from the quote
const txBuffer = Buffer.from(quoteData.transactionBase64, "base64");
const transaction = anchor.web3.Transaction.from(txBuffer);

// Verify transaction safety locally (recommended)
// This ensures the transaction matches what you requested

// Sign the transaction with either a local Keypair or a wallet adapter
const signedTransaction =
  "secretKey" in wallet
    ? (transaction.partialSign(wallet), transaction)
    : await wallet.signTransaction(transaction);

// Broadcast to Solana
const txSignature = await connection.sendRawTransaction(signedTransaction.serialize(), {
  skipPreflight: false,
  preflightCommitment: "confirmed"
});

// Confirm transaction
await connection.confirmTransaction(txSignature, "confirmed");
console.log("Purchase successful:", txSignature);
```

<Note>
  TxODDS may refuse purchase requests and ask for KYC (Know Your Customer) verification in accordance with compliance requirements.
</Note>

## Subscribe On-Chain

Subscribe to TxLINE on-chain after choosing a service level. Paid tiers require TxL; the free World Cup tiers do not require a TxL purchase. Choose between a standard subscription or a custom league selection.

Derive the shared accounts once before using either subscription tab:

```typescript theme={null}
const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("token_treasury_v2")],
  program.programId
);

const tokenTreasuryVault = getAssociatedTokenAddressSync(
  txlTokenMint,
  tokenTreasuryPda,
  true,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
);

const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("pricing_matrix")],
  program.programId
);

const userTokenAccount = getAssociatedTokenAddressSync(
  txlTokenMint,
  provider.wallet.publicKey,
  false,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
);
```

<Tabs>
  <Tab title="Standard Subscription">
    ```typescript theme={null}
    const SERVICE_LEVEL_ID = 1;
    const DURATION_WEEKS = 4;
    const SELECTED_LEAGUES: number[] = []; // Standard bundle

    const txSig = await program.methods
      .subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)
      .accounts({
        user: provider.wallet.publicKey,
        pricingMatrix: pricingMatrixPda,
        tokenMint: txlTokenMint,
        userTokenAccount,
        tokenTreasuryVault,
        tokenTreasuryPda,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    ```
  </Tab>

  <Tab title="Custom Leagues">
    ```typescript theme={null}
    const SERVICE_LEVEL_ID = 3;
    const DURATION_WEEKS = 4;
    const SELECTED_LEAGUES = [500001]; // Your league IDs

    const txSig = await program.methods
      .subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)
      .accounts({
        user: provider.wallet.publicKey,
        pricingMatrix: pricingMatrixPda,
        tokenMint: txlTokenMint,
        userTokenAccount,
        tokenTreasuryVault,
        tokenTreasuryPda,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    ```
  </Tab>
</Tabs>

## Activate Your API Token

After subscribing on-chain, activate your API access by signing the transaction and calling the activation endpoint.

```typescript theme={null}
// Get guest JWT
const authResponse = await axios.post(`${apiOrigin}/auth/guest/start`);
const jwt = authResponse.data.token;

// Sign the subscription transaction
const messageString = `${txSig}:${SELECTED_LEAGUES.join(",")}:${jwt}`;
const message = new TextEncoder().encode(messageString);

// For SELECTED_LEAGUES = [], this signs `${txSig}::${jwt}`.
async function signActivationMessage(message: Uint8Array): Promise<Uint8Array> {
  if ("signMessage" in wallet && wallet.signMessage) {
    return wallet.signMessage(message);
  }

  const localPayer = (provider.wallet as anchor.Wallet & {
    payer?: anchor.web3.Keypair;
  }).payer;

  if (localPayer) {
    return nacl.sign.detached(message, localPayer.secretKey);
  }

  throw new Error("Wallet must support signMessage, or run with a local Anchor payer.");
}

const signatureBytes = await signActivationMessage(message);
const walletSignature = Buffer.from(signatureBytes).toString("base64");

// Activate API access
const activationResponse = await axios.post(
  `${apiBaseUrl}/token/activate`,
  {
    txSig,
    walletSignature,
    leagues: SELECTED_LEAGUES,
  },
  { headers: { Authorization: `Bearer ${jwt}` } }
);

const apiToken = activationResponse.data.token || activationResponse.data;
```

You're now ready to use the API. Send both activated credentials with data API requests:

| Header          | Value                                        |
| --------------- | -------------------------------------------- |
| `Authorization` | `Bearer ${jwt}` from `/auth/guest/start`     |
| `X-Api-Token`   | `apiToken` returned by `/api/token/activate` |

## Next Steps

* View the complete [API Reference](/api-reference/authentication/start-a-new-guest-session) to explore all available endpoints
* Check out [Subscription Tiers](/documentation/subscription-tiers) for pricing and plan options
* Try the [World Cup Free Tier](/documentation/worldcup) for instant free access

> ## Documentation Index
> Fetch the complete documentation index at: https://txline-docs.txodds.com/llms.txt
> Use this file to discover all available pages before exploring further.

# World Cup Free Tier

> Access World Cup and International Friendlies data for free with TxLINE's complimentary tiers

## Start Building with Free World Cup Data

Experience the power of TxLINE's sports data API with our complimentary free tiers. Get instant access to World Cup and International Friendlies data with no payment required, no credit card needed, and no commitment. Choose between 60-second delayed data or real-time data - both completely free!

## What's Included

<CardGroup cols={2}>
  <Card title="Two Free Tiers Available" icon="trophy">
    **Service Level 1**: World Cup & Int Friendlies with 60-second delay
    **Service Level 12**: World Cup & Int Friendlies in real-time
  </Card>

  <Card title="Historical Replay" icon="clock-rotate-left">
    Full access to historical data for past matches and events analysis.
  </Card>

  <Card title="On-Chain Verification" icon="shield-check">
    Cryptographically verifiable data with Solana blockchain anchoring.
  </Card>

  <Card title="Production Ready" icon="rocket">
    Same reliable infrastructure as our premium tiers with comprehensive documentation.
  </Card>
</CardGroup>

<Info>
  **Perfect For**: Developers building proof-of-concepts, hobbyist projects, learning platforms, or testing TxLINE before upgrading to real-time data.
</Info>

## Getting Started

### Step 1: Choose a Network and Set Up Your Wallet

Use the same network for every step: the Solana RPC, TxLINE program ID, guest JWT, and activation endpoint must all match. A devnet subscription transaction cannot be activated on the mainnet API host.

```bash theme={null}
npm install @coral-xyz/anchor @solana/web3.js @solana/spl-token axios tweetnacl
```

```typescript theme={null}
import * as anchor from "@coral-xyz/anchor";
import type { Txoracle } from "./types/txoracle"; // Use the matching mainnet/devnet type
import txoracleIdl from "./idl/txoracle.json"; // Use the matching mainnet/devnet IDL
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import axios from "axios";
import nacl from "tweetnacl";

const NETWORK: "mainnet" | "devnet" = "devnet";

const CONFIG = {
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

const { rpcUrl, apiOrigin, programId, txlTokenMint } = CONFIG[NETWORK];
const apiBaseUrl = `${apiOrigin}/api`;

const connection = new Connection(rpcUrl, "confirmed");
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});
anchor.setProvider(provider);

const program = new anchor.Program<Txoracle>(
  txoracleIdl as Txoracle,
  provider
);

if (!program.programId.equals(programId)) {
  throw new Error(
    `Loaded IDL program ${program.programId.toBase58()} does not match ${NETWORK} program ${programId.toBase58()}`
  );
}
```

### Step 2: Subscribe to Free Tier

Choose between the free service levels that are enabled on your network. Mainnet offers service level `1` for 60-second delayed World Cup and International Friendlies data and service level `12` for real-time data. Devnet currently documents service level `1`; check the on-chain pricing matrix before using any other devnet row.

```typescript theme={null}
// Free tier configuration - choose one:
const SERVICE_LEVEL_ID = 1;  // World Cup & Int Friendlies (60-second delay)
// const SERVICE_LEVEL_ID = 12; // Mainnet real-time World Cup & Int Friendlies
const DURATION_WEEKS = 4; // Subscribe for 4 weeks at a time
const SELECTED_LEAGUES: number[] = []; // Empty for standard bundle

const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("token_treasury_v2")],
  program.programId
);

const tokenTreasuryVault = getAssociatedTokenAddressSync(
  txlTokenMint,
  tokenTreasuryPda,
  true,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
);

const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("pricing_matrix")],
  program.programId
);

const userTokenAccount = getAssociatedTokenAddressSync(
  txlTokenMint,
  provider.wallet.publicKey,
  false,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
);

// Subscribe on-chain
const txSig = await program.methods
  .subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)
  .accounts({
    user: provider.wallet.publicKey,
    pricingMatrix: pricingMatrixPda,
    tokenMint: txlTokenMint,
    userTokenAccount,
    tokenTreasuryVault,
    tokenTreasuryPda,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

console.log("Subscription transaction:", txSig);
```

<Note>
  **No Payment Required**: Free tiers require no TxL payment. The transaction still registers your wallet subscription on-chain and must be activated with the matching TxLINE API host.
</Note>

### Step 3: Activate Your API Access

After subscribing on-chain, activate your API token by signing and calling our activation endpoint.

```typescript theme={null}
// Get guest authentication token
const authResponse = await axios.post(`${apiOrigin}/auth/guest/start`);
const jwt = authResponse.data.token;

// Create message to sign
const messageString = `${txSig}:${SELECTED_LEAGUES.join(",")}:${jwt}`;
const message = new TextEncoder().encode(messageString);

// For SELECTED_LEAGUES = [], this signs `${txSig}::${jwt}`.
async function signActivationMessage(message: Uint8Array): Promise<Uint8Array> {
  if ("signMessage" in wallet && wallet.signMessage) {
    return wallet.signMessage(message);
  }

  const localPayer = (provider.wallet as anchor.Wallet & {
    payer?: anchor.web3.Keypair;
  }).payer;

  if (localPayer) {
    return nacl.sign.detached(message, localPayer.secretKey);
  }

  throw new Error("Wallet must support signMessage, or run with a local Anchor payer.");
}

const signatureBytes = await signActivationMessage(message);
const walletSignature = Buffer.from(signatureBytes).toString("base64");

// Activate your API access
const activationResponse = await axios.post(
  `${apiBaseUrl}/token/activate`,
  {
    txSig,
    walletSignature,
    leagues: SELECTED_LEAGUES,
  },
  {
    headers: { Authorization: `Bearer ${jwt}` }
  }
);

// Save your API token
const apiToken = activationResponse.data.token || activationResponse.data;
console.log("API Token activated successfully!");
```

### Step 4: Make Your First API Call

You're all set! Start fetching World Cup and International Friendlies data using your activated API credentials.

Check out the complete [API Reference](/api-reference/authentication/start-a-new-guest-session) for available endpoints including:

* **Fixtures** - Get upcoming and current fixture metadata
* **Odds** - Fetch snapshots, historical updates, and stream StablePrice odds
* **Scores** - Fetch snapshots, historical updates, and stream score events
* **Validation Proofs** - Retrieve fixture, odds, and score proofs for on-chain validation

Data API endpoints use `Authorization: Bearer ${jwt}` for the guest JWT and `X-Api-Token: ${apiToken}` for the activated API token.

## Ready for More?

Love the free tier? Upgrade to unlock:

<CardGroup cols={3}>
  <Card title="Real-Time Data" icon="bolt">
    Zero delay live data for time-sensitive applications
  </Card>

  <Card title="1000+ Leagues" icon="trophy">
    Access to all major leagues worldwide
  </Card>

  <Card title="Custom Leagues" icon="sliders">
    Choose exactly which leagues you need
  </Card>
</CardGroup>

View our [Subscription Tiers](/documentation/subscription-tiers) to see all available options. Paid tiers start from just **500,000 TxL (\$500) per 28 days**.

## Frequently Asked Questions

<AccordionGroup>
  <Accordion title="Do I need to renew my free subscription?">
    All subscriptions can be purchased for any duration in multiples of 4 weeks (28 days), up to 12 months. Simply re-subscribe when your access expires. There's no cost to renew free tiers.
  </Accordion>

  <Accordion title="Can I upgrade from free tier to paid?">
    Absolutely! You can upgrade at any time by subscribing to a paid tier. Your new subscription will take effect immediately.
  </Accordion>

  <Accordion title="Is there a rate limit on free tier?">
    No rate limits on API calls. However, data has a 60-second delay compared to premium real-time tiers.
  </Accordion>

  <Accordion title="What happens if I don't renew?">
    Your API access will expire after the subscription period ends. You can re-subscribe at any time to regain access.
  </Accordion>

  <Accordion title="Can I use this for commercial projects?">
    Yes! The free tier can be used for commercial projects. However, for production applications, we recommend upgrading to real-time data for the best user experience.
  </Accordion>
</AccordionGroup>

***

<Info>
  **Ready to start?** Follow the steps above to get your free API access in under 5 minutes. No credit card required.
</Info>
