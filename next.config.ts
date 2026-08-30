import type { NextConfig } from "next";

/**
 * GitHub Pages project site is served at /sheet-plan/ on github.io.
 * After DNS, bearcublodge.com gets a root hop to /sheet-plan/ (see pages-postbuild).
 * Local `next dev` stays unprefixed.
 */
const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH ??
  (process.env.NODE_ENV === "production" ? "/sheet-plan" : "");

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
  typedRoutes: false,
};

export default nextConfig;
