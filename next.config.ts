import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // minimal runtime bundle for the Docker image (see Dockerfile)
  output: "standalone",
  reactCompiler: true,
};

export default nextConfig;
