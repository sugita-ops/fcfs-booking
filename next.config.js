/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ESLint エラーがあっても本番ビルドを落とさない
    ignoreDuringBuilds: true,
  },
  // TypeScript エラーで落ちる場合は下も true に（必要になったら有効化）
  // typescript: { ignoreBuildErrors: true },
};
module.exports = nextConfig;
