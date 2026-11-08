/** @type {import('next').NextConfig} */
const API_INTERNAL = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

const nextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_INTERNAL}/api/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};
export default nextConfig;
