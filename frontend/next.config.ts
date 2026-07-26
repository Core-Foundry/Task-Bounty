import type { NextConfig } from "next";
import { getNextSecurityHeadersConfig } from "./security-headers.mjs";

const nextConfig: NextConfig = {
  // Suppress the X-Powered-By: Next.js header to avoid framework fingerprinting.
  poweredByHeader: false,

  async headers() {
    return getNextSecurityHeadersConfig();
  },
};

export default nextConfig;
