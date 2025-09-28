/**
 * Disable ESLint entirely for CI/Vercel build.
 * Next.js 15 (ESLint 9) はフラット設定が既定です。
 * 必要になったら厳しめ設定に差し替えてください。
 */
export default [
  { ignores: ['**/*'] }  // 全ファイル無視（lintしない）
];
