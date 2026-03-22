/** @type {import('next').NextConfig} */
// Прокси /api → backend включаем только если явно задан API_INTERNAL_URL.
const API_INTERNAL_URL = process.env.API_INTERNAL_URL?.trim()

const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    if (!API_INTERNAL_URL) return []
    return [
      {
        source: '/api/:path*',
        destination: `${API_INTERNAL_URL.replace(/\/+$/, '')}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
