import type { NextConfig } from "next";

const extraUploadHosts = (process.env.NEXT_PUBLIC_UPLOAD_IMAGE_HOSTNAME ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean)
  .map((hostname) => ({
    protocol:
      hostname === "localhost" || hostname.startsWith("127.")
        ? ("http" as const)
        : ("https" as const),
    hostname,
  }));

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      ...extraUploadHosts,
    ],
  },
};

export default nextConfig;
