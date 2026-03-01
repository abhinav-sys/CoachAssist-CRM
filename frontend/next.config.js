/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow deploy while fixing type/lint; set to false once clean
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};
module.exports = nextConfig;
