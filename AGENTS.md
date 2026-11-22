# AGENTS.md

AI エージェント (Claude Code など) と開発者向けのガイド。人間向けの概要は [readme.md](./readme.md)、利用者向けの使い方は [docs/readme.md](./docs/readme.md)。
関数の呼び出し関係・分岐条件・データの流れの図は [ARCHITECTURE.md](./ARCHITECTURE.md)。関数の構成や分岐を変えたら、こちらも更新する。

## 概要

YouTube のライブ配信・アーカイブのチャット欄を監視し、設定したフィルターに一致するチャットを保存・画像化する Chrome 拡張機能 (Manifest V3)。
データは全て `chrome.storage.local` に保存し、外部には送信しない。

- TypeScript 5.9 / Vue 3 (`<script setup>`) / Vite 8 / Tailwind CSS v4
- テスト: Vitest (jsdom) / 実ブラウザ確認: Playwright (`npm run e2e`)
- Node.js 20.19 以上

## コマンド

| コマンド | 内容 |
| :-- | :-- |
| `npm run build` | 本番ビルド → `dist/` (Chrome の「パッケージ化されていない拡張機能を読み込む」で読み込む) |
| `npm run build:dev` | 開発ビルド (minify なし, inline sourcemap) |
| `npm run watch` | 開発ビルド + 変更監視 (拡張機能の再読み込みは手動) |
| `npm run check` | 型チェック + lint + テスト + ビルド。**変更後は必ずこれを通す** |
| `npm run test` | ユニットテスト (Vitest) |
| `npm run e2e -- [url] [--wait 60] [--screenshot] [--headed]` | `dist/` を読み込んだ Chromium で実際の YouTube を開き、保存結果を表示する |
| `npm run screenshots` | 架空のサンプルデータで popup / options のスクリーンショットと CSV (`sample.csv`) を `test-results/` に出力する (UI 確認・使い方ページの画像用) |
| `npm run build-zip` | Chrome Web Store 公開用の zip を `dist-zip/` に作る |

- `npm run e2e` は初回のみ `npx playwright install chromium` が必要。url 省略時はライブ配信を検索して開く。
- E2E は実際の YouTube に依存するため CI では回さない。チャットの少ない配信だと 0 件になることがある (`--search` で検索語を変えられる)。

## 構成

```
src/
  manifest.json              MV3 マニフェスト (version はビルド時に package.json から入る)
  backgrounds/background.ts  Service Worker。タブごとのアイコン/バッジ更新のみ。状態を持たない
  content-scripts/
    page-bridge.ts           MAIN world。ページの playerResponse から動画情報を取り出して返すだけ
    content-script.ts        isolated world のエントリ
    PageEventer.ts           ページ遷移の検知 → 動画情報取得 → チャット iframe の監視
    ChatHandler.ts           チャット要素 → Chat → フィルター → 保存/画像化キュー
    BadgeManager.ts          background にアイコン/バッジ更新を依頼
  lib/
    bridge/protocol.ts       content-script <-> page-bridge の postMessage プロトコル
    parser/                  YouTube のデータ (DOM, playerResponse) の解析。YouTube 依存はほぼここに集約
    chrome/                  chrome.* API のラッパー (storage, messages, tabs)
    queue/                   画像化・保存を順番に処理するキュー
    chatFilter/              チャットフィルター (保存する/画像化する の判定)
    util/                    日付整形, 画像化 (modern-screenshot), Web フォントの埋め込み, ファイル名整形 など
  models/                    Chat, Video, Config (fromPlain / toPlain で storage と相互変換)
  popup/, options/           Vue 3 の画面
scripts/
  build.js                   Vite を 3 回呼んで dist/ を組み立てる (下記)
  e2e.js                     実ブラウザ確認
test/                        Vitest。fixtures/ に実際の YouTube の DOM / playerResponse を縮小したもの
```

### ビルドの仕組み (`scripts/build.js`)

content script は ES module を読み込めないため、Vite を 3 回に分けて呼んでいる。

1. popup / options (HTML) + background (ES module の Service Worker)。`manifest.json` と `readme/` もここで出力
2. `content-script.js` (IIFE, 単一ファイル)
3. `page-bridge.js` (IIFE, 単一ファイル)

`vite.config.ts` は無い (設定は `scripts/build.js` に集約)。Vitest 用の設定は `vitest.config.ts`。

### データの流れ

```
YouTube ページ (www.youtube.com/watch?v=...)
 ├─ page-bridge (MAIN world)   movie_player.getPlayerResponse() 等 → VideoData
 │     ↑↓ window.postMessage (lib/bridge/protocol.ts)
 ├─ content-script (isolated)  yt-page-data-updated → PageEventer
 │     └─ iframe#chatframe (/live_chat or /live_chat_replay, same origin)
 │          └─ MutationObserver(#item-scroller) → ChatHandler → ChatParser
 │               → DrawDomQueue (modern-screenshot) → SaveChatQueue → chrome.storage.local
 └─ chrome.runtime.sendMessage → background → chrome.action (アイコン/バッジ)
popup / options → chrome.storage.local を直接読み書き
```

### storage の形式 (v1 から互換を維持すること)

| key | 値 |
| :-- | :-- |
| `@config` | `Config.toPlain()` |
| `@videos` | `Video.toPlain()[]` (閲覧日時の降順, 最大 `maxVideoLength` 件) |
| `<動画ID>` | `Chat.toPlain()[]` |

- 日時は **epoch msec の number** で保存する (v1 の class-transformer 時代と同じ)。`lib/util/serialize.ts` の `toTime` / `toDate` を使う。
- フィールドを追加する場合はクラスの初期値で既存データを補完できるようにする (`fromPlain` は `Object.assign(new X(), plain)`)。
- 基本フィルター (`ChatFilter` の `BASE_FILTERS`) を追加した場合、既存ユーザーの `@config` には無いので `ChatFilter.complementChatFilterConfigs` で補完される。既存の挙動を変えないよう、必要なら `INHERIT_FILTER_KEYS` で引き継ぎ元を指定する。
- フィールドの削除・リネーム・型変更は既存ユーザーのデータを壊すので避ける。必要なら `fromPlain` で移行する。

## YouTube の仕様変更への対応

YouTube の DOM / 内部データは予告なく変わる。動かなくなったら:

1. `npm run build && npm run e2e -- --screenshot` を実行し、出力の `RESULT` と問題点、`=== chat frame (DOM) ===` の要素数を見る
2. 0 になっているセレクタや `video: (not saved)` から壊れた箇所を特定する
3. 必要なら一時的な Playwright スクリプトで実際の DOM (`outerHTML`) を調べる (headless では UA を通常の Chrome にしないとチャットが表示されない。`scripts/e2e.js` 参照)
4. 修正したら `test/fixtures/` を実際の DOM に合わせて更新し、テストを追加する

YouTube に依存している箇所:

| 依存 | 場所 |
| :-- | :-- |
| SPA 遷移イベント `yt-page-data-updated` | `content-scripts/PageEventer.ts` |
| 動画情報 `movie_player.getPlayerResponse()`, `ytd-watch-flexy.playerData`, `ytInitialPlayerResponse` | `content-scripts/page-bridge.ts` |
| playerResponse の構造 (`videoDetails`, `microformat.playerMicroformatRenderer.liveBroadcastDetails`) | `lib/parser/PlayerResponseParser.ts` |
| 開いた時点の同時接続数 `ytd-watch-flexy.data` の `videoPrimaryInfoRenderer.viewCount.videoViewCountRenderer` (`isLive`, `originalViewCount`) | `content-scripts/page-bridge.ts`, `PlayerResponseParser.parseConcurrentViewers` |
| 同時接続数 `#view-count` の aria-label ("26,905 人が視聴中", 配信中のみ更新される)。aria-label が無ければ中の `yt-animated-rolling-number` (margin-top で数字の列をずらす表示) を `VideoParser.readRollingNumber` で読む | `content-scripts/PageEventer.ts`, `VideoParser.parseConcurrentViewers` |
| チャット欄 `ytd-live-chat-frame#chat iframe#chatframe`, `yt-live-chat-item-list-renderer #item-scroller` | `content-scripts/PageEventer.ts` |
| チャット要素のタグ名・`#author-name`・`#message`・`#timestamp`・バッジ等 | `lib/parser/ChatParser.ts` |
| 時刻表示 (配信中 `9:50 AM`、アーカイブ `1:23:45`) | `ChatParser.parseTimestamp` |
| 画像化時のスタイル調整 | `lib/util/NodeToPng.ts` |

過去の変更履歴 (2026-11 に確認):

- 動画情報の `<script id="scriptTag">` (JSON-LD) は廃止された → MAIN world の page-bridge で playerResponse を読むように変更
- チャット iframe は `src` 属性なしで読み込まれる → `load` を待つだけでなく、読み込み済みかを確認してから監視を始める
- `DOMNodeRemoved` (Mutation Events) は Chrome 127 で削除された → MutationObserver で iframe の切断を検知
- 時刻表示は ja ロケールでも `9:50 AM` 形式で、間に `U+202F` (narrow no-break space) が入る
- 投稿者名は `@handle` 形式
- メンバー歴 (マイルストーン) チャットは加入と同じ `yt-live-chat-membership-item-renderer` で、`#header-primary-text` ("メンバー歴 11 か月") の中身の有無で区別する (加入でも空の `#header-primary-text` がある)。`#header-subtext` はメンバーシップ名、`#message` は本文 (省略可)
- トップチャット (名前の後ろの 👑#1) は `#before-content-buttons` 内の `<button aria-label="#1">`。`ChatParser.parseTopChatRank` で順位を取る
- スーパーチャットへの返信は、同じ `#before-content-buttons` 内のボタンの文字が `@handle` (背景はスパチャの色)。`ChatParser.parseReplyTo` で返信先を取る

- メンバー歴と加入の要素には、それぞれ `has-primary-header-text` / `show-only-header` 属性が付く。要素の追加直後は `#header-primary-text` の文字がまだ無いことがあるので、属性も見て判定する (文字だけで判定すると加入に混ざる)
- スーパーチャットには購入回数の節目のおまけが付くことがある: `#lower-bumper` に "ライブ配信での 5 回目の Super をお祝いしましょう" (`ChatParser.parseSuperCount`)、`#overlay-image` に飾り画像 (www.gstatic.com, CORS で読めないので画像化しない)
- メンバーシップギフト (贈った側) は `ytd-sponsorships-live-chat-gift-purchase-announcement-renderer`。文は `#primary-text` ("〇〇 のメンバーシップ ギフトを 10 個贈りました")、**`#timestamp` が無い**ので配信中は現在時刻にする (`ChatParser.liveNowTimes`)。右の飾り画像 `.rhs-image` は www.gstatic.com にあり CORS で読めないので画像化しない

未確認 (実データで検証できていない) もの: スーパーチャット・スーパーステッカーの DOM、ギフトを受け取った側のお知らせ (`ytd-sponsorships-live-chat-gift-redemption-announcement-renderer` と思われる, 未対応)、アーカイブでのギフトの表示。

## ハマりどころ

- **iframe 内のノードは realm が違う**: content script から見た iframe 内の要素に `instanceof Element` / `HTMLElement` は false になる。`nodeType` / `localName` で判定する。
- **Service Worker は状態を持てない**: いつでも停止・再起動される。グローバル変数に状態を置かない。
- **onMessage は Promise を返せない**: `lib/chrome/messages.ts` の `listenMessages` を使う (`sendResponse` + `return true`)。
- **拡張機能を再読み込みすると、開いているタブの古い content script は `chrome.runtime` が使えなくなる**: `Runtime.isContextValid()` で確認している。ページを再読み込みすれば直る。
- **画像化 (modern-screenshot) ではページの Web フォントが使えない**: SVG を img として読み込んで描くため、フォントは data url で埋め込む必要がある。YouTube の Google Fonts の CSS は別ドメインで `cssRules` を読めないので、`lib/util/WebFontEmbedder.ts` が fetch し直して英数字 (latin) の範囲だけ埋め込んでいる (1 回だけ作って使い回す)。日本語は Roboto に無いので端末のフォントで描かれる (YouTube の画面と同じ)。
- **画像化は width / height を明示している**: 指定しないと横幅が揃わず、margin 分が切れる (`NodeToPng.generate`)。
- **画像化の確認は `npm run e2e -- --screenshot`**: `test-results/chat-image-N.png` (作った画像) と `chat-real-N.png` (ブラウザの実物) を見比べる。
- **headless Chromium の UA (`HeadlessChrome`) だと YouTube のチャットが「ブラウザが古い」になる**: E2E では通常の UA を指定している。
- **拡張機能は Playwright の headless shell では動かない**: `channel: 'chromium'` を指定している。
- **Windows でカレントディレクトリが `c:\` (小文字) だと Vitest が壊れる**: `npm test` は `scripts/vitest.js` 経由で起動して回避している。`npx vitest` を直接使わない。

## 使い方ページ (docs/readme.md)

- 拡張機能の利用者 (パソコンに詳しくない人も含む) 向け。専門用語を避け、手順は番号付きで書く。
- ビルド時に `readme/index.html` に変換され、設定画面の「使い方」から開かれる。GitHub 上でもそのまま読める。
- 見出しの id は GitHub と同じ規則で付けている (`scripts/build.js` の `headingSlug`) ので、目次リンクは `[文字](#見出し文字)` で両方で動く。
- 囲みは `<div class="note|tip|warn">`、開閉する項目は `<details><summary>` (スタイルは `docs/assets/readme.css`)。
- 機能や設定項目を変えたら、ここの説明も更新する。

## 画面のスタイル

- Tailwind CSS v4 (`@tailwindcss/vite`)。設定ファイルは無く、`src/styles/main.css` に集約している。
- 画面ごとのスタイルは `.vue` のテンプレートにユーティリティクラスで書く (`<style scoped>` は使わない)。
- 何度も使う部品だけ `main.css` の `@layer components` にまとめている: `.btn` (+ `.btn-primary` / `.btn-secondary` / `.btn-ghost` / `.btn-danger` / `.btn-danger-solid`, 大きさ `.btn-sm` / `.btn-icon`), `.input`, `.select`, `.checkbox`, `.label`, `.help`, `.card`, `.badge` (+ `.badge-accent` など), `.notice` (+ `.notice-warning`)。
- 色: 無彩色は Tailwind の `zinc` をそのまま使う。それ以外は `@theme inline` の用途ごとの色 (`primary`, `accent`, `success`, `warning`, `danger`, `info`) を使う (`bg-primary`, `text-danger` など)。配色を変えるときは `@theme inline` の参照先を差し替える。
- 文字サイズは `body` に付けている。`html` に付けると rem 基準の `text-xs` などまで小さくなるので注意。
- アイコン (@mdi/font) の CSS は `popup.ts` / `options.ts` で import する。`main.css` で `@import` するとフォントの URL が壊れる。
- 共通コンポーネント: `components/ToggleSwitch.vue`, `components/ToastContainer.vue` (+ `plugins/Toast.ts`)。
- popup の `.app-chat-main` は「独自のデザインで画像化」でそのまま画像になるので、見た目を変えるときは出力画像も確認する。
- CSV 出力は `lib/util/ChatCsv.ts`。列を変えたら `test/ChatCsv.test.ts` と使い方ページの項目一覧も更新する。Excel 向けに BOM + CRLF、数式として解釈される先頭文字には `'` を付けている。
- `.trigger` / `.chat` / ボタンの文言は `scripts/screenshots.js` から参照しているので、変えたらスクリプトも直す。

## コーディング規約

- コメント・UI 文言・コミットメッセージは日本語 (既存に合わせる)。
- 書式は ESLint だけで揃える (Prettier は使わない)。`eslint.config.js` (flat config) で [ESLint Stylistic](https://eslint.style/) を使い、シングルクォート・セミコロンなし・インデント 2・末尾カンマあり・140 桁。`npm run lint:fix` でほぼ自動で直る。
- Vue のテンプレートは eslint-plugin-vue、Tailwind のクラスは eslint-plugin-better-tailwindcss で確認する (標準クラスへの書き換え `enforce-canonical-classes`、並び順、長いクラスの折り返しなど)。独自の部品クラスやアイコンを増やしたら `eslint.config.js` の `NON_TAILWIND_CLASSES` に追加する。
- 型のみの import は `import type` (`verbatimModuleSyntax`)。
- chrome API は `chrome.*` の Promise 版を直接使う (webextension-polyfill は使わない)。
- YouTube に依存するセレクタや構造は parser / PageEventer に閉じ込め、定数にして名前を付ける。
- 権限 (`permissions`, `host_permissions`) は最小限にする。増やす場合は理由をコミットメッセージに書く。
- コミットメッセージは `[add]`, `[fix]`, `[update]` などのプレフィックス + 日本語 (既存の履歴に合わせる)。
