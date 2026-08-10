import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // La rubrique Docs lit les markdown du repo (../docs) à la requête :
  // les inclure dans le bundle serverless déployé sur Vercel.
  outputFileTracingIncludes: {
    "/docs/[[...slug]]": [path.join(__dirname, "../docs/**/*.md")],
  },
};

export default nextConfig;
