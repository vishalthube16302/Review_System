import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

// Enables access to Cloudflare bindings (if/when added) during `next dev`.
// No-op if the app doesn't use any Cloudflare-specific bindings yet.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
