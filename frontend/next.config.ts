import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: appDir,
    resolveAlias: {
      tailwindcss: join(appDir, "node_modules/tailwindcss/index.css"),
      "tw-animate-css": join(
        appDir,
        "node_modules/tw-animate-css/dist/tw-animate.css",
      ),
      "shadcn/tailwind.css": join(appDir, "node_modules/shadcn/dist/tailwind.css"),
    },
  },
};

export default nextConfig;
