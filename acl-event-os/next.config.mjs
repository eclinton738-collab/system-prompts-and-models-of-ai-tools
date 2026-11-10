/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Camera access for the gate scanner; everything else locked down.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Permissions-Policy", value: "camera=(self)" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};
export default nextConfig;
