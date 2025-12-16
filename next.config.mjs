import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  // production環境のみService Workerを有効化
  disable: process.env.NODE_ENV !== 'production',
  reloadOnOnline: true,
  register: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 16ではeslintはnext.config.mjsではなくCLIオプションで設定
  typescript: {
    ignoreBuildErrors: true,
  },
  // Turbopack設定（空でも明示的に設定）
  turbopack: {},
};

export default withSerwist(nextConfig);
