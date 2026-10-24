import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

/** Function ACTIVE only proves deployment, not which revision receives requests. */
export function assertServingRevision(fn, service) {
  const revision = fn?.serviceConfig?.revision;
  const fail = (reason) => { throw new Error(`Serving revision check failed: ${reason}`); };
  if (fn?.state !== "ACTIVE" || !revision) fail("function has no active deployed revision");
  if (fn.serviceConfig.allTrafficOnLatestRevision !== true) fail("function traffic is not following the latest revision");
  if (!service?.metadata?.generation || String(service.status?.observedGeneration) !== String(service.metadata.generation)) fail("Cloud Run has not observed the current configuration");
  for (const type of ["Ready", "RoutesReady"]) {
    if (!service.status?.conditions?.some((c) => c.type === type && c.status === "True")) fail(`${type} is not true`);
  }
  if (service.status.latestCreatedRevisionName !== revision || service.status.latestReadyRevisionName !== revision) fail("deployed revision is not the latest ready revision");
  const configured = service.spec?.traffic;
  if (!Array.isArray(configured)) fail("traffic configuration is missing");
  const allocation = configured.filter((t) => (t.percent ?? 0) !== 0);
  if (allocation.length !== 1 || allocation[0].percent !== 100 || allocation[0].latestRevision !== true || allocation[0].revisionName) fail("default traffic must follow the latest revision at 100 percent");
  const observed = service.status.traffic;
  if (!Array.isArray(observed)) fail("observed traffic is missing");
  let total = 0;
  for (const target of observed) {
    const percent = target.percent ?? 0;
    if (!Number.isInteger(percent) || percent < 0 || percent > 100) fail("invalid observed traffic percentage");
    if (percent > 0 && target.revisionName !== revision) fail("requests still reach an older revision");
    total += percent;
  }
  if (total !== 100) fail("observed traffic does not total 100 percent");
  return revision;
}

export function describeServingRevision(name) {
  if (!["app", "api", "apiAi", "apiStripe", "apiStore"].includes(name)) throw new Error("Unknown production function");
  const describe = (args) => JSON.parse(execFileSync("gcloud", args, { encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024 }));
  const common = ["--region=us-central1", "--project=yardup-2026"];
  const fn = describe(["functions", "describe", name, "--gen2", ...common,
    "--format=json(state,serviceConfig.revision,serviceConfig.allTrafficOnLatestRevision)"]);
  const service = describe(["run", "services", "describe", name.toLowerCase(), ...common,
    "--format=json(metadata.generation,spec.traffic,status.observedGeneration,status.conditions,status.latestCreatedRevisionName,status.latestReadyRevisionName,status.traffic)"]);
  return { fn, service };
}

export async function verifyServingRevisions(names, {
  describe = describeServingRevision,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  log = console.log,
  attempts = 8,
} = {}) {
  for (const name of names) {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const { fn, service } = await describe(name);
        const revision = assertServingRevision(fn, service);
        log(`${name}: ${revision} receives 100% of traffic and future releases follow latest.`);
        break;
      } catch (error) {
        if (attempt === attempts) throw new Error(`${name}: ${error.message}`);
        log(`${name}: waiting for serving revision (${attempt}/${attempts}).`);
        await wait(15_000);
      }
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyServingRevisions(["app", "api", "apiAi", "apiStripe", "apiStore"]).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
