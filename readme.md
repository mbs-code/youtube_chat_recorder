# Youtube Chat Recorder

App to operate streaming chat.
YouTube のチャットがあるページ（ライブ、アーカイブ等）を開いた際に、チャットを監視し操作する Chrome 拡張機能 (Manifest V3)。

TypeScript + Vue 3 + Vite + Tailwind CSS

使い方はここ。
[How to Usage](./docs/readme.md)

開発者・AI エージェント向けの詳しい説明はここ。
[AGENTS.md](./AGENTS.md)

## 開発

Node.js 20.19 以上が必要です。

```sh
npm install
npm run build   # dist/ を chrome://extensions の「パッケージ化されていない拡張機能を読み込む」で読み込む
```

## command

command of `npm run`

|command|description|
|:--|:--|
|`build`|ビルドする (`dist/`)|
|`build:dev`|開発版のビルドをする (minify しない)|
|`watch`|開発版の自動ビルド|
|`build-zip`|chrome 公開用に zip 化する (`dist-zip/`)|
|`check`|型チェック + lint + テスト + ビルド|
|`typecheck`|vue-tsc|
|`lint` / `lint:fix`|eslint (書式も含む。`lint:fix` で自動修正)|
|`test` / `test:watch`|ユニットテスト (vitest)|
|`e2e`|実際の YouTube で動作確認する (playwright, 初回は `npx playwright install chromium`)|

## v2.0.0 での変更

- Manifest V3 に移行 (Service Worker, `action`, `host_permissions`)。権限から `tabs` を削除
- webpack 4 + Vue 2 → Vite + Vue 3 に移行。依存パッケージを全て更新
- YouTube の仕様変更に対応 (動画情報の取得方法、チャット iframe の検知、`DOMNodeRemoved` の廃止)
- 保存データの形式は v1 と互換
