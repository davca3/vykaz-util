/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'
const isTauri = process.env.TAURI_BUILD === '1'

const nextConfig = {
  output: 'export',
  basePath: isTauri ? '' : (isProd ? '/vykaz-util' : ''),
  assetPrefix: isTauri ? '' : (isProd ? '/vykaz-util' : ''),
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false };
    return config;
  },
}

module.exports = nextConfig
