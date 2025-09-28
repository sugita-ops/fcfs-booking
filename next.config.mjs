/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,  // ビルド時に ESLint を無視
  },
  // 必要に応じて他設定をここに追加してください
};

export default nextConfig;
