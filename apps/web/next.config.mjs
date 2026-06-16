/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @repo/db is consumed as TypeScript source from the workspace.
  transpilePackages: ["@repo/db"],
};

export default nextConfig;
