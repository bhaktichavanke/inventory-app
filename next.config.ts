import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma's generated client + query engine binary are runtime dependencies
  // of the API routes but aren't always discovered through static imports —
  // make sure they're bundled into the deployed serverless functions.
  outputFileTracingIncludes: {
    '/*': ['./node_modules/.prisma/client/**/*'],
  },
  // Note: Next.js 16 removed the `next lint` command and the `eslint`
  // next.config option — ESLint is no longer run as part of `next build`
  // at all, so it cannot block deployment. (TypeScript's build-time type
  // checking is unaffected and still runs.) Run `npm run lint` manually /
  // in CI if you want ESLint's ~19 pre-existing no-explicit-any warnings
  // surfaced and cleaned up over time.
};

export default nextConfig;
