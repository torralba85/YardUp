import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { deploymentEnvironment, deploymentMarker, githubApi } from "./github.mjs";
import { productionEvent } from "./scope.mjs";

export async function recordDeployment(command, env = process.env, api = githubApi) {
  if (!productionEvent(env.GITHUB_EVENT_NAME, env.GITHUB_REF)) {
    throw new Error("Production records can only be written by master push/dispatch runs");
  }
  const logUrl = `${env.GITHUB_SERVER_URL ?? "https://github.com"}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`;
  if (command === "start") {
    const deployment = await api("/deployments", { method: "POST", body: {
      ref: env.GITHUB_SHA,
      environment: deploymentEnvironment,
      auto_merge: false,
      required_contexts: [], // The job already requires the aggregate verify gate.
      production_environment: true,
      payload: { marker: deploymentMarker, run_id: env.GITHUB_RUN_ID },
      description: "Firebase release after CI verification",
    } });
    if (!Number.isSafeInteger(deployment.id)) throw new Error("Invalid deployment record ID");
    await api(`/deployments/${deployment.id}/statuses`, { method: "POST", body: {
      state: "in_progress", log_url: logUrl, auto_inactive: false,
    } });
    return deployment.id;
  }
  if (command !== "finish" || !/^\d+$/.test(env.DEPLOYMENT_ID ?? "")) {
    throw new Error("Invalid deployment command or ID");
  }
  await api(`/deployments/${env.DEPLOYMENT_ID}/statuses`, { method: "POST", body: {
    state: env.DEPLOYMENT_OUTCOME === "success" ? "success" : "failure",
    log_url: logUrl,
    environment_url: "https://lotfoundry.net",
    auto_inactive: false,
  } });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const id = await recordDeployment(process.argv[2]);
  if (id) appendFileSync(process.env.GITHUB_OUTPUT, `id=${id}\n`);
}
