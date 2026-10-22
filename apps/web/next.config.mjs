/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@nexus/ui', '@nexus/contracts'],
  reactStrictMode: true,
};

export default nextConfig;
