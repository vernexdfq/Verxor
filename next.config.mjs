/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Existing UI lives under src/; keep client components working.
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
