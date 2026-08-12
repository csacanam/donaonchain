import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /**
     * Next 16 requires an explicit allowlist here — an open one would let
     * anyone burn the optimizer on qualities we never asked for.
     *
     * 50 is for the photo contact sheet in the letter. Those frames are
     * rubble: high-entropy texture, the worst case for an image codec, and at
     * quality 75 a single 640px tile came back at 120 KB of WebP — larger than
     * the JPEG it replaced. At 50 the same tile is a fraction of that, and the
     * tiles render 201px wide, where the difference is not visible. 75 stays
     * for everything else, including the full-screen view of those same
     * photos, where it is.
     */
    qualities: [50, 75],
  },
};

export default nextConfig;
