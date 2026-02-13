import { spawnSync } from "node:child_process";
import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "radix-ui"],
  },
};

// PWA support is disabled by default
// To enable: set ENABLE_PWA=true environment variable
const createConfig = () => {
  const isPwaEnabled = process.env.ENABLE_PWA === "true";

  if (!isPwaEnabled || process.env.NODE_ENV !== "production") {
    return nextConfig;
  }

  // Using `git rev-parse HEAD` might not the most efficient
  // way of determining a revision. You may prefer to use
  // the hashes of every extra file you precache.
  const revision =
    spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout ??
    crypto.randomUUID();

  const withSerwist = withSerwistInit({
    additionalPrecacheEntries: [
      {
        url: "/~offline",
        revision,
      },
    ],
    swSrc: "src/app/sw.ts",
    swDest: "public/sw.js",
  });

  return withSerwist(nextConfig);
};

// Sentry must be the outermost wrapper
export default withSentryConfig(createConfig(), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  tunnelRoute: "/monitoring",
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
