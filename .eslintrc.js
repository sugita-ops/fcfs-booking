/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['next/core-web-vitals', 'next/typescript'],
  rules: {
    // Allow require() in .js files in lib/ and scripts/ directories
    '@typescript-eslint/no-require-imports': 'warn',
    // Allow any type in specific contexts (reduce to warning for MVP)
    '@typescript-eslint/no-explicit-any': 'warn',
    // Allow unused vars for now during development
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }
    ]
  },
  overrides: [
    {
      files: ['lib/**/*.js', 'scripts/**/*.js'],
      rules: {
        '@typescript-eslint/no-require-imports': 'off'
      }
    },
    {
      files: ['tests/**/*', '**/*.test.ts', '**/*.test.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off'
      }
    }
  ]
};