// Real estate agent passes: create, inspect, report on and revoke the codes that let
// buyers claim one complimentary certificate for an agent's listing.
//
//   node scripts/agent-pass.mjs create --layout <48-hex token> --code SMITH-ELM \
//     --agent "Jane Smith" --brokerage "Example Realty" [--dre 01234567] [--max 10] [--days 30] [--write]
//   node scripts/agent-pass.mjs report --code SMITH-ELM
//   node scripts/agent-pass.mjs revoke --code SMITH-ELM [--write]
//
// --layout is the token from the listing's Studio "Email this layout" link; the pass is bound
// to that lot's certificate key, so a buyer opening the agent's link always matches it.
// create and revoke print what they would write and change nothing without --write, which
// writes to PRODUCTION Firestore (yardup-2026): run it only with Andrew's OK for that pass.
// Credentials come from Application Default Credentials (gcloud ADC or
// GOOGLE_APPLICATION_CREDENTIALS). Firestore rules deny every client read and write of
// agentPasses; /api/certificates/redeem spends them (lib/server/agent-passes.ts).
import { pathToFileURL } from "node:url";

const PROJECT_ID = "yardup-2026";
const ORIGIN = "https://lotfoundry.net";
const LAYOUT_TOKEN = /^[a-f0-9]{48}$/;
// Mirrors lib/agent-pass.ts normalizeAgentPassCode (scripts/agent-pass.test.ts keeps them equal).
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,22}[A-Z0-9]$/;

/** Mirrors lib/certificate-key.ts certificateKey (scripts/agent-pass.test.ts keeps them equal). */
export function certKeyFor(address, city) {
  const slug = `${address ?? ""} ${city ?? ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "lot";
}

export function normalizeCode(raw) {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase().replace(/\s+/g, "");
  return CODE_PATTERN.test(code) ? code : null;
}

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = { write: false };
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === "--write") options.write = true;
    else if (arg.startsWith("--")) options[arg.slice(2)] = rest[++i];
    else throw new Error(`Unexpected argument: ${arg}`);
  }
  return { command, options };
}

/** The listing's address and city from a stored layout snapshot (studioScenarioLeads). */
export function listingFromSnapshot(snapshot) {
  let scenario = null;
  try {
    scenario = typeof snapshot === "string" ? JSON.parse(snapshot) : null;
  } catch {
    return null;
  }
  const parcel = scenario?.liveParcel;
  if (!parcel || typeof parcel.address !== "string" || typeof parcel.city !== "string") return null;
  return { address: parcel.address, city: parcel.city, state: parcel.state ?? "" };
}

/** sd_/sj_ campaigns match the outreach email drafts; anything else is the generic pilot. */
export function campaignFor(city) {
  const c = city.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (c.includes("san diego")) return "sd_agent_pilot_202611";
  if (c.includes("san jose")) return "sj_agent_pilot_202611";
  return "agent_pilot_202611";
}

/** The link the agent shares: their listing layout, their code and their UTM tag. */
export function agentLink({ layout, code, city }) {
  const url = new URL("/studio", ORIGIN);
  url.searchParams.set("layout", layout);
  url.searchParams.set("pass", code);
  url.searchParams.set("utm_source", `agent_${code.toLowerCase()}`);
  url.searchParams.set("utm_medium", "referral");
  url.searchParams.set("utm_campaign", campaignFor(city));
  return url.toString();
}

export function buildPass({ options, listing, now = new Date() }) {
  const max = Number(options.max ?? 10);
  const days = Number(options.days ?? 30);
  if (!Number.isInteger(max) || max < 1 || max > 50) throw new Error("--max must be a whole number from 1 to 50");
  if (!Number.isInteger(days) || days < 1 || days > 120) throw new Error("--days must be a whole number from 1 to 120");
  if (!options.agent || !options.brokerage) throw new Error("--agent and --brokerage are required");
  return {
    certKey: certKeyFor(listing.address, listing.city),
    status: "active",
    maxRedemptions: max,
    redemptions: 0,
    expiresAt: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
    agentName: String(options.agent).trim(),
    brokerage: String(options.brokerage).trim(),
    ...(options.dre ? { dreLicense: String(options.dre).trim() } : {}),
    listingAddress: listing.address,
    listingCity: listing.city,
    layoutToken: options.layout,
  };
}

async function firestore() {
  const { getApps, initializeApp, applicationDefault } = await import("firebase-admin/app");
  const { getFirestore, FieldValue, Timestamp } = await import("firebase-admin/firestore");
  if (!getApps().length) initializeApp({ projectId: PROJECT_ID, credential: applicationDefault() });
  return { db: getFirestore(), FieldValue, Timestamp };
}

function requireCode(options) {
  const code = normalizeCode(options.code);
  if (!code) throw new Error("--code must be 4-24 letters, digits or inner hyphens, e.g. SMITH-ELM");
  return code;
}

async function create(options) {
  const code = requireCode(options);
  if (!LAYOUT_TOKEN.test(options.layout ?? "")) throw new Error("--layout must be the 48-character token from the listing's layout link");
  const { db, FieldValue, Timestamp } = await firestore();
  const layout = await db.collection("studioScenarioLeads").doc(options.layout).get();
  const listing = listingFromSnapshot(layout.data()?.scenarioSnapshot);
  if (!listing) throw new Error("That layout has no real parcel; open the listing in the Studio and email the layout again");
  const pass = buildPass({ options, listing });
  console.log(JSON.stringify({ code, ...pass, expiresAt: pass.expiresAt.toISOString() }, null, 2));
  console.log(`\nAgent link: ${agentLink({ layout: options.layout, code, city: listing.city })}`);
  if (!options.write) {
    console.log("\nDry run: nothing written. Add --write to create this pass in production.");
    return;
  }
  // create() refuses an existing code, so a pass is never silently reset.
  await db.collection("agentPasses").doc(code).create({
    ...pass,
    expiresAt: Timestamp.fromDate(pass.expiresAt),
    createdAt: FieldValue.serverTimestamp(),
  });
  console.log(`\nCreated agentPasses/${code}.`);
}

/** Count only paid grants strictly after a known redemption timestamp. */
export function isSubsequentPaidGrant(grant, redemption) {
  const redeemedAt = redemption.createdAt?.toMillis?.();
  const purchasedAt = grant.createdAt?.toMillis?.();
  return grant.source !== "agent_pass" && grant.demo !== true &&
    Number.isFinite(grant.amount) && grant.amount > 0 &&
    Number.isFinite(redeemedAt) && Number.isFinite(purchasedAt) && purchasedAt > redeemedAt;
}

async function report(options) {
  const code = requireCode(options);
  const { db } = await firestore();
  const passRef = db.collection("agentPasses").doc(code);
  const pass = await passRef.get();
  if (!pass.exists) throw new Error(`agentPasses/${code} does not exist`);
  const data = pass.data();
  const redemptions = await passRef.collection("redemptions").get();
  // Paid orders by accounts that claimed with this code: real Stripe or store grants only.
  let paidOrders = 0;
  let paidCents = 0;
  for (const redemption of redemptions.docs) {
    const grants = await db.collection("certificatePurchases").where("uid", "==", redemption.id).get();
    for (const grant of grants.docs) {
      const g = grant.data();
      if (!isSubsequentPaidGrant(g, redemption.data())) continue;
      paidOrders += 1;
      paidCents += g.amount;
    }
  }
  console.log(JSON.stringify({
    code,
    status: data.status,
    agentName: data.agentName,
    brokerage: data.brokerage,
    listing: `${data.listingAddress}, ${data.listingCity}`,
    expiresAt: data.expiresAt?.toDate?.().toISOString(),
    redemptions: `${data.redemptions ?? 0} of ${data.maxRedemptions}`,
    paidOrdersByRedeemers: paidOrders,
    paidAmountByRedeemers: `$${(paidCents / 100).toFixed(2)} (reconcile against the Stripe ledger; excludes refunds)`,
  }, null, 2));
}

async function revoke(options) {
  const code = requireCode(options);
  const { db, FieldValue } = await firestore();
  const ref = db.collection("agentPasses").doc(code);
  if (!(await ref.get()).exists) throw new Error(`agentPasses/${code} does not exist`);
  if (!options.write) {
    console.log(`Dry run: would set agentPasses/${code} status to "revoked". Add --write to apply.`);
    return;
  }
  await ref.update({ status: "revoked", revokedAt: FieldValue.serverTimestamp() });
  console.log(`Revoked agentPasses/${code}. Certificates already claimed stay unlocked.`);
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  const commands = { create, report, revoke };
  if (!commands[command]) {
    console.error("Usage: node scripts/agent-pass.mjs <create|report|revoke> [options]; see the header comment.");
    process.exit(1);
  }
  await commands[command](options);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`agent-pass: ${error.message}`);
    process.exit(1);
  });
}
