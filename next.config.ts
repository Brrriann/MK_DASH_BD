import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["react-signature-canvas"],
  outputFileTracingRoot: path.join(__dirname),
  async redirects() {
    return [
      { source: "/meetings", destination: "/interactions", permanent: true },
      { source: "/meetings/:path*", destination: "/interactions", permanent: true },
      { source: "/estimates", destination: "/documents?tab=estimates", permanent: true },
      { source: "/contracts", destination: "/documents?tab=contracts", permanent: true },
      { source: "/invoices", destination: "/documents?tab=invoices", permanent: true },
    ];
  },
};

export default nextConfig;
