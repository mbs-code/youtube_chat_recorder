/**
 * Vitest (ユニットテスト) の設定.
 *
 * - テストは test/**\/*.test.ts. DOM を使うパーサーのテストのため jsdom で動かす.
 * - Windows でカレントディレクトリが c:\ (小文字) だと壊れるので、`npm test` (scripts/vitest.js 経由) で実行すること.
 */
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.ts'],
  },
})
