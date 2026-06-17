import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";

// The monorepo keeps a single shared `.env` at the repo root (the Python worker
// reads it the same way — see apps/worker/src/worker/config.py). Next.js only
// loads env files from its own app dir, so load the repo-root `.env` here to
// pick up NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY etc. before Next
// inlines them. Existing process.env values (e.g. CI) take precedence.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const rootEnv = resolve(repoRoot, ".env");
if (existsSync(rootEnv)) {
  globalThis.process.loadEnvFile(rootEnv);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @repo/db is consumed as TypeScript source from the workspace.
  transpilePackages: ["@repo/db"],
};

export default nextConfig;
