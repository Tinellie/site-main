import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  rewrites() {
    return {
      beforeFiles: [{ source: "/assets/:path*", destination: "/api/gallery/assets/:path*" }],
    };
  },
  outputFileTracingIncludes: {
    "/api/icons": ["./.generated/mui-icons.json"],
    "/api/icons/*": ["./.generated/mui-icons.json"],
    "/api/cards": ["./.generated/mui-icons.json"],
    "/api/cards/*": ["./.generated/mui-icons.json"],
  },
  outputFileTracingExcludes: {
    "/*": ["./content/**/*", "./public/assets/**/*", "./data/**/*", "./backups/**/*", "./.env*"],
  },
};

export default nextConfig;
