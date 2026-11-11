import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/api/icons": ["./.generated/mui-icons.json"],
    "/api/icons/*": ["./.generated/mui-icons.json"],
    "/api/cards": ["./.generated/mui-icons.json"],
    "/api/cards/*": ["./.generated/mui-icons.json"],
  },
};

export default nextConfig;
