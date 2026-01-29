/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/vykaz-util',
  assetPrefix: '/vykaz-util',
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false };
    return config;
  },
}

module.exports = nextConfig
