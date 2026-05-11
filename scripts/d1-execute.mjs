import { spawnSync } from "node:child_process";

const [, , target, file] = process.argv;

const targetConfig = {
  local: {
    databaseEnv: "D1_DATABASE_NAME",
    scopeArg: "--local",
  },
  prod: {
    databaseEnv: "D1_DATABASE_NAME",
    scopeArg: "--remote",
  },
  preview: {
    databaseEnv: "D1_PREVIEW_DATABASE_NAME",
    scopeArg: "--remote",
  },
};

const config = targetConfig[target];

if (!config || !file) {
  console.error("Usage: node scripts/d1-execute.mjs <local|prod|preview> <sql-file>");
  process.exit(1);
}

const databaseName = process.env[config.databaseEnv];

if (!databaseName) {
  console.error(`Missing required environment variable: ${config.databaseEnv}`);
  process.exit(1);
}

const result = spawnSync(
  "wrangler",
  ["d1", "execute", databaseName, config.scopeArg, "--file", file],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
