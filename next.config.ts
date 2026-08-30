import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // minimal runtime bundle for the Docker image (see Dockerfile)
  output: "standalone",
  reactCompiler: true,
  // The Drizzle migrator reads db/migrations via fs at runtime, invisible
  // to standalone output tracing — without this the Docker image ships
  // without migrations and the first request fails.
  outputFileTracingIncludes: {
    "/": ["./db/migrations/**"],
    "/**": ["./db/migrations/**"],
  },
};

export default nextConfig;
