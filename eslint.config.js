/**
 * ESLint の設定 (flat config).
 *
 * - コードの書式は ESLint Stylistic (https://eslint.style/) で揃える. (Prettier は使わない)
 * - Vue のテンプレートは eslint-plugin-vue、Tailwind のクラスは eslint-plugin-better-tailwindcss で確認する.
 * - `npm run lint:fix` でほとんどの書式は自動で直る.
 */
import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'
import vue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/**
 * Tailwind のユーティリティではないが、テンプレートで使っているクラス (no-unknown-classes の対象外にする).
 *
 * - src/styles/main.css の @layer components で定義している部品 (.btn, .card など)
 * - アイコン (@mdi/font の .mdi, .mdi-xxx)
 * - scripts/screenshots.js や画像化で参照している目印 (.trigger, .chat, .app-chat, .app-chat-main)
 */
const NON_TAILWIND_CLASSES = [
  '^btn(-.+)?$',
  '^(input|select|checkbox|label|help|card)$',
  '^badge(-.+)?$',
  '^notice(-.+)?$',
  '^mdi(-.+)?$',
  '^(trigger|chat|app-chat|app-chat-main)$',
]

export default tseslint.config(
  { ignores: ['dist/', 'dist-zip/', 'node_modules/', 'docs/', 'test-results/'] },

  // ===== 基本 =====
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },

  // ===== 実行環境ごとのグローバル変数 =====
  {
    files: ['src/**/*.{ts,vue}', 'test/**/*.ts'],
    languageOptions: { globals: { ...globals.browser, chrome: 'readonly' } },
  },
  {
    files: ['scripts/**/*.js', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  {
    // page.evaluate() などブラウザ内で実行されるコードを含む
    files: ['scripts/e2e.js', 'scripts/screenshots.js'],
    languageOptions: { globals: { ...globals.browser, chrome: 'readonly' } },
  },

  // ===== 書式 (ESLint Stylistic) =====
  stylistic.configs.customize({
    indent: 2,
    quotes: 'single',
    semi: false,
    arrowParens: false, // 引数が 1 つならカッコを付けない (本体が { } のときは付ける)
    braceStyle: '1tbs',
    commaDangle: 'always-multiline',
    jsx: false,
  }),
  {
    rules: {
      '@stylistic/max-len': ['warn', { code: 140, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true, ignoreComments: true }],
    },
  },

  // ===== Vue テンプレートの書式 =====
  {
    files: ['**/*.vue'],
    rules: {
      'vue/max-attributes-per-line': ['error', { singleline: { max: 4 }, multiline: { max: 1 } }],
      'vue/singleline-html-element-content-newline': 'off', // <span class="...">文字</span> を 1 行で書けるように
      'vue/multi-word-component-names': 'off',
    },
  },

  // ===== Tailwind CSS =====
  {
    files: ['src/**/*.vue'],
    plugins: { 'better-tailwindcss': betterTailwindcss },
    settings: {
      // rootFontSize: px の任意値 (mt-[3px] など) を標準クラス (mt-0.75) に直すための基準
      'better-tailwindcss': { entryPoint: 'src/styles/main.css', rootFontSize: 16 },
    },
    rules: {
      'better-tailwindcss/enforce-canonical-classes': 'error', // h-[72px] -> h-18 など (VS Code の suggestCanonicalClasses と同じ)
      'better-tailwindcss/no-deprecated-classes': 'error',
      'better-tailwindcss/no-duplicate-classes': 'error',
      'better-tailwindcss/no-conflicting-classes': 'error',
      'better-tailwindcss/no-unnecessary-whitespace': 'error',
      'better-tailwindcss/enforce-consistent-class-order': 'warn',
      // 長いクラスは複数行に折り返す (1 行に収まるなら 1 行)
      'better-tailwindcss/enforce-consistent-line-wrapping': ['warn', { printWidth: 140, preferSingleLine: true }],
      'better-tailwindcss/no-unknown-classes': ['error', { ignore: NON_TAILWIND_CLASSES }],
    },
  },

  // ===== その他 =====
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    },
  },
)
