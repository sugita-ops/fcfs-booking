/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ビルド時の ESLint エラーを無視
  },
  typescript: {
    ignoreBuildErrors: true, // ビルド時の TypeScript エラーを無視
  },
  // 他の設定があればこの下に
};

export default nextConfig;
