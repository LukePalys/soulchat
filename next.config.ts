import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/soulchat',
  assetPrefix: '/soulchat',
  images: {
    unoptimized: true,
  },
  trailingSlash: false,
  distDir: 'docs',
}

export default nextConfig
