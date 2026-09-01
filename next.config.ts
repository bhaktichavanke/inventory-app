import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma's SQLite database and native engine are runtime dependencies of
  // server functions, but neither is discovered reliably through imports.
  outputFileTracingIncludes: {
    '/*': [
      './prisma/dev.db',
      './node_modules/.prisma/client/**/*',
    ],
  },
};

export default nextConfig;
