import { spawnSync } from "node:child_process";

const commands = [
  ["npm", ["run", "typecheck"]],
  ["npm", ["test"]],
  ["npm", ["run", "backend:typecheck"]],
  ["npm", ["run", "backend:test"]],
  ["npm", ["run", "backend:build"]],
  ["npx", ["expo-doctor"]],
  ["npx", ["expo", "config", "--json"]],
];

for (const [cmd, args] of commands) {
  console.log(`\n> Running: ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    console.error(`\n✖ Command failed: ${cmd} ${args.join(" ")}`);
    process.exit(1);
  }
}

console.log("\n✔ All release checks passed!");
process.exit(0);
