/**
 * Flat ESLint config for Next.js 15 / ESLint 9.
 * CI/Vercel ビルドでは lint を完全に無効化（必要になったら差し替えてください）
 */
export default [
  { ignores: ['**/*'] }  // 全ファイル無視（lintしない）
];
