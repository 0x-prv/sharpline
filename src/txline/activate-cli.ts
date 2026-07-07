import { subscribeFreeWorldCupTier, getGuestJwt, activateApiToken } from "./auth.js";
import { writeFileSync } from "fs";

async function main() {
  console.log("Subscribing to TxLINE World Cup free tier...");
  const txSig = await subscribeFreeWorldCupTier();
  console.log("Subscribed. Transaction signature:", txSig);

  console.log("Requesting guest JWT...");
  const jwt = await getGuestJwt();

  console.log("Activating API token...");
  const apiToken = await activateApiToken(txSig, jwt, []);

  const session = { jwt, apiToken, createdAt: new Date().toISOString() };
  writeFileSync("./.txline-session.json", JSON.stringify(session, null, 2));

  console.log("Done. Saved to .txline-session.json");
  console.log(session);
}

main().catch((err) => {
  console.error("Activation failed:", err?.response?.data || err.message || err);
  process.exit(1);
});