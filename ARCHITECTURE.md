# 関数構成とデータの流れ

この拡張機能の「どの関数がどこから呼ばれるか」「何の値で分岐するか」「データがどの関数を通るか」をまとめたもの。
図は Mermaid なので、GitHub や VS Code の Markdown プレビュー (Mermaid 対応) で表示できる。

- 開発の進め方・コマンド・ハマりどころは [AGENTS.md](./AGENTS.md)
- ファイルパスは `src/` からの相対パス。関数名は `クラス.メソッド` で書く

**目次**

1. [全体の構成](#1-全体の構成)
2. [ページを開いてから監視を始めるまで](#2-ページを開いてから監視を始めるまで)
3. [チャット 1 件が保存されるまで](#3-チャット-1-件が保存されるまで)
4. [分岐の詳細](#4-分岐の詳細)
5. [メッセージ (拡張機能内の通信)](#5-メッセージ-拡張機能内の通信)
6. [popup (アイコンをクリックした画面)](#6-popup-アイコンをクリックした画面)
7. [設定画面](#7-設定画面)
8. [storage (保存データ)](#8-storage-保存データ)
9. [関数一覧 (呼び出し元つき)](#9-関数一覧-呼び出し元つき)
10. [分岐に使う定数・設定値](#10-分岐に使う定数設定値)
11. [ビルド](#11-ビルド)

---

## 1. 全体の構成

拡張機能は 5 つの実行場所に分かれていて、それぞれ別の JavaScript 環境で動く。

```mermaid
flowchart LR
  subgraph YT["YouTube のタブ (www.youtube.com)"]
    direction TB
    PB["page-bridge.ts<br/>MAIN world<br/>ページの JS が見える"]
    CS["content-script.ts<br/>isolated world<br/>chrome.* が使える"]
    IF["チャット欄 iframe<br/>/live_chat・/live_chat_replay"]
    CS -- "window.postMessage<br/>(動画情報の問い合わせ)" --> PB
    PB -- "VideoData" --> CS
    CS -. "MutationObserver で監視" .-> IF
  end

  BG["background.ts<br/>Service Worker"]
  POP["popup<br/>アイコンをクリックした画面"]
  OPT["options<br/>設定画面"]
  ST[("chrome.storage.local")]

  CS -- "YCR_SET_BADGE / YCR_SET_ICON" --> BG
  POP -- "YCR_RESET_BADGE" --> CS
  OPT -- "YCR_LOAD_CONFIG" --> BG
  BG -- "chrome.action<br/>アイコン・バッジ" --> ICON["ツールバーのアイコン"]

  CS -- "動画・チャットを保存<br/>設定を読む" --> ST
  POP -- "読む・削除" --> ST
  OPT -- "設定を保存・読む<br/>バックアップ・削除" --> ST
  BG -- "設定を読む" --> ST
```

| 実行場所 | エントリ | 役割 |
| :-- | :-- | :-- |
| MAIN world | `content-scripts/page-bridge.ts` | ページの `playerResponse` から動画情報を取り出して返すだけ |
| isolated world | `content-scripts/content-script.ts` | ページ遷移の検知、チャット欄の監視、チャットの解析・保存 |
| Service Worker | `backgrounds/background.ts` | タブごとのアイコン・バッジの更新 (状態は持たない) |
| popup | `popup/popup.ts` → `popup/App.vue` | 記録したチャットの閲覧・削除・CSV・画像の保存 |
| 設定画面 | `options/options.ts` → `options/App.vue` | 設定の編集、データの管理 |

---

## 2. ページを開いてから監視を始めるまで

```mermaid
sequenceDiagram
  autonumber
  participant YT as YouTube ページ
  participant PE as PageEventer
  participant PH as PageHelper
  participant PB as page-bridge
  participant VS as VideoStorage
  participant BM as BadgeManager
  participant CH as ChatHandler

  Note over PE: content-script.ts が new PageEventer(new ChatHandler()).init()
  PE->>PE: init() → loadConfig()<br/>ConfigStorage.get() / chatFilter.setChatFilters() / handler.setDrawOnce()
  alt config.runScript が false
    PE-->>PE: 何もしない
  end
  PE->>YT: addEventListener('yt-page-data-updated', onPageUpdated)
  PE->>PE: onPageUpdated() (初回は自分で呼ぶ)

  YT-)PE: yt-page-data-updated (SPA 遷移のたび)
  PE->>PE: generation++ / disconnect()
  PE->>BM: deactivateIcon() / clearBadgeCounter()
  PE->>PE: loadVideo(generation)
  PE->>PH: getPageVideoId() (URL から動画 ID)
  loop retry 最大 15 回 / 500ms 間隔
    PE->>PH: requestVideoData(videoId)
    PH->>PB: postMessage YCR_GET_VIDEO_DATA
    PB-->>PH: postMessage YCR_VIDEO_DATA (VideoData | null)
  end
  PE->>PE: VideoParser.parse(videoData) → Video
  PE->>VS: save(video, config.maxVideoLength)
  PE->>BM: waitingIcon() (青)
  opt video.isLiveNow
    PE->>PE: startWatchViewers(video, generation)<br/>#view-count の表示の変化を MutationObserver で監視 (+ 30 秒ごと)<br/>最大を超えたら VideoStorage.updateMaxViewers
  end
  PE->>PE: attachChatFrame(generation)<br/>iframe#chatframe を探す / load と削除の監視を付ける
  alt iframe が読み込み済み
    PE->>PE: connectChat(iframe, generation)
  else まだ
    YT-)PE: iframe の load → onIframeLoad() → connectChat()
  end
  PE->>CH: setVideo(video) (保存先の動画を設定)
  PE->>PE: chatObserver.observe(#item-scroller)
  PE->>BM: activateIcon() (赤)
  opt config.captureInitialChats
    PE->>CH: findInvoke(scroller, chatFilter) (表示済みのチャット)
  end
```

`generation` は遷移のたびに増える番号。非同期処理の途中で別の動画に移ったら、古い処理はこの番号の不一致で中断する。

---

## 3. チャット 1 件が保存されるまで

```mermaid
flowchart TD
  MO["chatObserver (MutationObserver)<br/>#item-scroller に要素が追加された"] --> INV["ChatHandler.invoke(node, chatFilter)"]
  INV --> C1{"video.id がある?<br/>要素ノード?<br/>タグ名が CHAT_NODE_NAMES?"}
  C1 -- "いいえ" --> END1(["無視"])
  C1 -- "はい" --> PARSE["ChatParser.parse(video, node)<br/>→ Chat"]
  PARSE --> TASK["ChatFilter.checkChatTaskType(chat)"]
  TASK --> C2{"taskType"}
  C2 -- "'image'" --> DQ["DrawDomQueue.push({ node, chat })"]
  C2 -- "'save'" --> SQ["SaveChatQueue.push(chat)"]
  C2 -- "false" --> END2(["保存しない"])

  DQ --> DI["DrawDomQueue.invoke(objects)"]
  DI --> C3{"drawOnce かつ<br/>drawnIds に ID がある?"}
  C3 -- "はい" --> SKIP["画像化しない<br/>(保存時に storage の画像を引き継ぐ)"]
  C3 -- "いいえ" --> PNG["NodeToPng.generateChatImageUrl(node)<br/>→ chat.pngUrl"]
  PNG -- "失敗" --> ERR["chat.isImageError = true"]
  SKIP --> SQ
  PNG --> SQ
  ERR --> SQ

  SQ --> SI["SaveChatQueue.invoke(chats)"]
  SI --> CS["ChatStorage.save(videoId, chats)<br/>同じ ID は置き換え (作成日時・画像は引き継ぐ)"]
  CS --> STORE[("storage: 動画ID の key")]
  SI --> BADGE["BadgeManager.addBadgeCounter(件数)<br/>→ Runtime.sendBadgeText()"]
  BADGE --> BG["background: chrome.action.setBadgeText()"]
```

キュー (`BaseQueue`) は最大 `COUNT_TO_PROCESS_AT_ONE` (10) 件ずつ順番に処理し、処理中に来たものは `PROCESS_INTERVAL` (1000ms) ごとにまとめて処理する。

---

## 4. 分岐の詳細

### 4-1. PageEventer.onPageUpdated (監視を始めるかどうか)

```mermaid
flowchart TD
  S(["yt-page-data-updated"]) --> A{"Runtime.isContextValid()<br/>拡張機能が再読み込みされていない?"}
  A -- "いいえ" --> A1(["監視を止めてリスナーも外す"])
  A -- "はい" --> B{"getPageVideoId()<br/>/watch?v= か /live/ の URL?"}
  B -- "いいえ" --> B1(["アイコン: グレーのまま"])
  B -- "はい" --> C{"requestVideoData()<br/>ID が一致する動画情報が取れた?"}
  C -- "15 回失敗" --> C1(["エラー (ログ) / グレー"])
  C -- "途中で遷移した" --> C2(["中断 (generation 不一致)"])
  C -- "はい" --> D{"video.isBroadcast が false<br/>かつ config.ignoreSimpleVideo?"}
  D -- "はい" --> D1(["保存しない / グレー"])
  D -- "いいえ" --> E["VideoStorage.save()<br/>アイコン: 青"]
  E --> F{"video.isBroadcast?<br/>(ライブ配信・アーカイブ・配信予定)"}
  F -- "いいえ (普通の動画)" --> F1(["チャット欄は探さない / 青"])
  F -- "はい" --> G{"iframe#chatframe が見つかった?<br/>(retry 10 回 / 1 秒)"}
  G -- "いいえ" --> G1(["チャットが無効 / 非表示 / 青"])
  G -- "はい" --> H{"iframe の中が /live_chat<br/>かつ #item-scroller がある?"}
  H -- "はい" --> I(["監視開始 / アイコン: 赤"])
  H -- "いいえ" --> H1(["エラー (ログ)"])
```

監視中に iframe が DOM から外れた場合は `removalObserver` が `disconnect()` → `attachChatFrame()` で探し直す。iframe が再読み込みされた場合 (上位のチャット ↔ チャットの切り替えなど) は `onIframeLoad()` → `connectChat()` で監視し直す。

### 4-2. ChatFilter.checkStuckChatFilter (保存するか・画像化するか)

`setChatFilters()` の時点で「保存する」「画像化する」が両方オフのフィルターは除外され、「画像化する」のものが先頭に並ぶ。

```mermaid
flowchart TD
  S(["chat"]) --> L["フィルターを先頭から順に見る"]
  L --> A{"判定関数 func がある?"}
  A -- "いいえ" --> N["次のフィルター"]
  A -- "はい" --> B{"doImage がオン?<br/>または (まだ保存候補が無く doSave がオン)?"}
  B -- "いいえ" --> N
  B -- "はい" --> C{"func(chat) が true?"}
  C -- "いいえ" --> N
  C -- "はい" --> D{"doImage?"}
  D -- "はい" --> IMG(["'image' で即決定"])
  D -- "いいえ" --> SAVE["保存候補として覚える"] --> N
  N --> E{"まだ残っている?"}
  E -- "はい" --> A
  E -- "いいえ" --> F{"保存候補がある?"}
  F -- "はい" --> R1(["'save'"])
  F -- "いいえ" --> R2(["false (保存しない)"])
```

基本フィルターの判定関数 (`BASE_FILTERS`):

| key | 表示名 | 当てはまる条件 |
| :-- | :-- | :-- |
| `all` | すべて表示 | 常に true (popup の絞り込み専用) |
| `plain` | ⬜ 通常チャット | 下のどれにも当てはまらない |
| `owner` | 🟨 チャンネルの所有者 | `isOwner` |
| `verified` | ✅ 確認済み | `isVerified` |
| `moderator` | 🔧 モデレーター | `isModerator` |
| `superchat` | 💰 スーパーチャット | `isSuperChat` または `isSuperStickers` |
| `member` | 🟩 メンバー | `isMember` |
| `joinmember` | ➕ メンバー加入 | `isJoinMember` |
| `milestone` | 🎉 メンバー歴 | `isMilestone` |
| `gift` | 🎁 メンバーシップギフト | `isGift` |
| `topchat` | 👑 トップチャット | `topChatRank !== undefined` |
| `screply` | 💬 スーパーチャットへの返信 | `replyTo !== undefined` |

テキストマッチング (`generateChatFilterFunc`) は `textMode` で比べる対象 (`message` → `chat.message` / `author` → `chat.authorName`) を決め、`isRegex` → 正規表現、`isExact` → 完全一致、どちらでもなければ部分一致で判定する。不正な正規表現のフィルターは判定関数が作れないので無視される。

### 4-3. ChatParser.parse (チャット要素 → Chat)

```mermaid
flowchart TD
  N(["チャット要素 (CHAT_NODE_NAMES のどれか)"]) --> TS{"#timestamp がある?"}
  TS -- "はい" --> T["parseTimestamp(#timestamp)"]
  TS -- "いいえ (ギフト)" --> LN["liveNowTimes()<br/>配信中なら現在時刻 / それ以外は空"]
  N --> AU["#author-name / #author-photo img"]
  N --> MSG["#message → extractText()<br/>message (文字のみ) / altMessage (絵文字を :名前: で展開)"]
  N --> TYPE{"author-type 属性"}
  TYPE -- "owner" --> O["isOwner"]
  TYPE -- "moderator" --> MO["isModerator"]
  TYPE -- "member" --> ME["isMember"]
  N --> BADGE{"yt-live-chat-author-badge-renderer の type"}
  BADGE -- "owner / verified / moderator" --> F1["isOwner / isVerified / isModerator"]
  BADGE -- "member" --> F2["isMember<br/>memberMonths = parseMemberMonth(aria-label)"]
  N --> RANK["parseTopChatRank()<br/>#before-content-buttons の button aria-label='#1'"]
  N --> RPL["parseReplyTo()<br/>#before-content-buttons の button の文字が '@handle' → replyTo"]
  N --> SC{"#purchase-amount がある?"}
  SC -- "はい" --> SC1["isSuperChat / money・moneyUnit<br/>(parsePurchaseAmount)<br/>superCount = parseSuperCount(#lower-bumper)"]
  N --> ST{"#purchase-amount-chip がある?"}
  ST -- "はい" --> ST1["isSuperStickers / money<br/>altMessage = ステッカーの alt"]
  N --> MB{"タグが membership-item-renderer?"}
  MB -- "はい" --> MB0{"show-only-header 属性がある?"}
  MB0 -- "はい (加入)" --> MB1
  MB0 -- "いいえ" --> MBW["#header-primary-text の文字を待つ<br/>retry 3 回 × 300ms"] --> MB1
  MB1{"#header-primary-text に文字がある<br/>または has-primary-header-text 属性?"}
  MB1 -- "はい" --> MS["isMilestone (メンバー歴)<br/>memberMonths はヘッダーの値を優先"]
  MB1 -- "いいえ" --> JN["isJoinMember (メンバー加入)"]
  N --> GF{"タグが gift-purchase-announcement-renderer?"}
  GF -- "はい" --> GF1["isGift / giftCount = parseGiftCount(#primary-text)<br/>message = #primary-text"]
```

時刻の解析 (`parseTimestamp`):

```mermaid
flowchart TD
  S(["#timestamp の文字"]) --> N["空白 (U+00A0, U+202F) を普通の空白に"]
  N --> A{"h:mm の形<br/>かつ (AM/PM/午前/午後 がある<br/>または video.type が 'live')?"}
  A -- "はい" --> CLK["時計の時刻として今日の日付で補う<br/>未来なら前日 / 90 秒以内なら現在時刻<br/>seconds = 日時 - video.startDate"]
  A -- "いいえ" --> B{"[-]h:mm または [-]h:mm:ss の形?"}
  B -- "はい" --> OFS["配信開始からの経過時間 (アーカイブ)<br/>datetime = video.startDate + 秒"]
  B -- "いいえ" --> NONE(["解析できない (空)"])
```

### 4-4. Video.type (動画の種類)

```mermaid
flowchart TD
  S(["Video"]) --> A{"isBroadcast も startDate も無い?"}
  A -- "はい" --> V(["'video' 普通の動画"])
  A -- "いいえ" --> B{"isUpcoming?"}
  B -- "はい" --> U(["'upcoming' 配信予定"])
  B -- "いいえ" --> C{"isLiveNow または endDate が無い?"}
  C -- "はい" --> L(["'live' 配信中"])
  C -- "いいえ" --> R(["'archive' アーカイブ"])
```

`type` は時刻の解析 (`'live'` なら時計の時刻) と popup の表示 (ライブ / 配信予定 / アーカイブ) で使う。

### 4-5. page-bridge (動画情報の取り出し)

```mermaid
flowchart TD
  S(["postMessage を受け取った"]) --> A{"event.source が window<br/>かつ isBridgeRequest()?"}
  A -- "いいえ" --> X(["無視"])
  A -- "はい" --> F["findVideoData(videoId)"]
  F --> C["playerResponseCandidates()<br/>1. #movie_player.getPlayerResponse()<br/>2. ytd-watch-flexy.playerData<br/>3. window.ytInitialPlayerResponse"]
  C --> P["候補を順に parsePlayerResponse()"]
  P --> M{"videoId が一致?"}
  M -- "はい" --> OK(["その VideoData を返す"])
  M -- "どれも不一致" --> NG(["null を返す (content script が再試行)"])
```

SPA 遷移直後は `ytInitialPlayerResponse` が前の動画のままなので、新しい順に候補を見て ID が一致するものだけを返す。

---

## 5. メッセージ (拡張機能内の通信)

すべて `lib/chrome/messages.ts` の型で定義し、受け取り側は `listenMessages(accept, handler)` で登録する (`sender.id` が自分の拡張機能のものだけ受け付ける)。

```mermaid
sequenceDiagram
  participant CS as content script
  participant BG as background
  participant POP as popup
  participant SET as 設定画面

  Note over CS,BG: チャットを保存した時・状態が変わった時
  CS->>BG: YCR_SET_BADGE { text } (Runtime.sendBadgeText)
  BG->>BG: chrome.action.setBadgeText({ tabId: 送信元のタブ })
  CS->>BG: YCR_SET_ICON { state } (Runtime.sendIconState)
  BG->>BG: chrome.action.setIcon({ tabId, path: ICONS[state] })

  Note over POP,CS: popup を開いた時
  POP->>CS: YCR_RESET_BADGE (Runtime.sendResetBadge(tabId))
  CS->>CS: BadgeManager.clearBadgeCounter()
  CS->>BG: YCR_SET_BADGE { text: '' }

  Note over SET,BG: 設定画面を開いた・保存した時
  SET->>BG: YCR_LOAD_CONFIG (Runtime.sendLoadConfig)
  BG->>BG: applyConfig() → Logger のレベルを反映
```

| type | 送信元 → 送信先 | 送る関数 | 受け取る関数 |
| :-- | :-- | :-- | :-- |
| `YCR_SET_BADGE` | content → background | `Runtime.sendBadgeText` | `background.handleMessage` |
| `YCR_SET_ICON` | content → background | `Runtime.sendIconState` | `background.handleMessage` |
| `YCR_LOAD_CONFIG` | 設定画面 → background | `Runtime.sendLoadConfig` | `background.handleMessage` |
| `YCR_RESET_BADGE` | popup → content | `Runtime.sendResetBadge` | `content-script.ts` の `listenMessages` |
| `YCR_GET_VIDEO_DATA` | content → page-bridge (postMessage) | `PageHelper.requestVideoData` | `page-bridge.ts` の message リスナー |
| `YCR_VIDEO_DATA` | page-bridge → content (postMessage) | `page-bridge.ts` | `PageHelper.requestVideoData` (requestId で照合) |

アイコンの状態 (`IconState`) と呼ぶ場所:

| state | 色 | 呼ぶ関数 | タイミング |
| :-- | :-- | :-- | :-- |
| `inactive` | グレー | `BadgeManager.deactivateIcon` | 遷移した直後 |
| `waiting` | 青 | `BadgeManager.waitingIcon` | 動画を保存した後 / 監視を止めた時 |
| `active` | 赤 | `BadgeManager.activateIcon` | `connectChat` で監視を始めた時 |

---

## 6. popup (アイコンをクリックした画面)

```mermaid
flowchart TD
  M(["onMounted"]) --> R["BrowserTabs.getActiveTab()<br/>→ Runtime.sendResetBadge(tab.id)"]
  M --> V["VideoStorage.getAll() → videos"]
  V --> VD["VideoDropdown の watch<br/>開いているタブの動画 ID (PageHelper.getPageVideoId)<br/>無ければ videos[0]"]
  VD -- "emit change" --> HV["handleVideoChange(video)"]
  HV --> RC["reloadChats()<br/>ChatStorage.get(video.id) → chats"]
  ST0["chrome.storage.onChanged<br/>(@videos / 選んでいる動画のチャット)"] --> STAT
  ST0 --> SC
  RC --> STAT["VideoStats (一覧の上)<br/>最大同接・最大再生数 (日時・配信開始から)<br/>Chat.sumMoney(chats): 一番多い通貨 + 外貨 〇 件"]
  RC --> SC["sortedChats (computed)<br/>絞り込み: chatFilters[selectedFilterKey].func<br/>並び: Chat.compareByTime<br/>sortOrder が 'desc' なら逆順"]
  SC --> CL["ChatList → ChatPanel (全件表示)<br/>クリックで selectedChats に追加 / 削除"]

  CL --> DEL["handleDeleteSelectedChats<br/>ChatStorage.remove()"]
  CL --> CSV["handleSaveCsv<br/>ChatCsv.createObjectURL(video, selectedChats)<br/>→ Filer.downloadFile()"]
  CL --> IMG["handleSaveToMerge"]
  IMG --> IC{"ConfigStorage.get() の設定"}
  IC -- "generateOriginalImage" --> G1["全て generateOriginalImage()<br/>(popup 上の .app-chat-main を NodeToPng.generate)"]
  IC -- "pngUrl がある" --> G2["chat.pngUrl を使う"]
  IC -- "pngUrl が無く complementImage" --> G3["generateOriginalImage()"]
  IC -- "pngUrl が無く complementImage がオフ" --> G4["そのチャットは飛ばす"]
  G1 & G2 & G3 --> MG["NodeToPng.merge(urls)<br/>config.formatFilename() → Filer.downloadImage()"]
```

---

## 7. 設定画面

```mermaid
flowchart TD
  M(["onMounted"]) --> LC["loadConfig()"]
  LC --> CG["ConfigStorage.get()<br/>→ Config.fromPlain()<br/>→ ChatFilter.complementChatFilterConfigs()"]
  CG --> F["form (編集中の値) / saved (読み込んだ時の JSON)"]
  LC --> BU["Storage.getBytesInUseLocalStorage()"]
  LC --> LCB["Runtime.sendLoadConfig() → background"]

  F --> D{"isDirty<br/>JSON.stringify(form) !== saved"}
  D -- "変更あり" --> BAR["保存バーに表示 / 閉じる時に確認"]

  F --> SV["handleSave()"]
  SV --> V{"maxVideoLength が MIN_VIDEO_LENGTH (5) 以上?"}
  V -- "いいえ" --> V1["5 にして警告"]
  V -- "はい" --> V2["整数にする"]
  V1 & V2 --> CS["ConfigStorage.save(config)"] --> LC

  F --> CFT["ChatFilterTable (v-model: form.chatFilters)<br/>handleFilterAdd / Edit / Delete / Test"]
  CFT --> TEST["handleFilterTest<br/>new ChatFilter().setChatFilters() → checkStuckChatFilter()"]

  subgraph DATA["データの管理"]
    E1["handleExportConfig → ConfigStorage.export()"]
    E2["handleExportData → Storage.export()"]
    E3["handleExportAllCsv<br/>VideoStorage.getAll() → 動画ごとに ChatStorage.get()<br/>→ ChatCsv.createManyObjectURL()"]
    I1["handleImportConfig → ConfigStorage.import()"]
    I2["handleImportData → Storage.import()"]
    X1["handleDeleteVideos → ChatStorage.clear() × 動画 / VideoStorage.clear()"]
    X2["handleAllDelete → Storage.clear()"]
  end
```

後から追加された基本フィルターは、`Config.fromPlain()` の中で `complementChatFilterConfigs()` が補う。初期値は `INHERIT_FILTER_KEYS` の引き継ぎ元 (`milestone` ← `joinmember`, `topchat` ← `plain`, `screply` ← `plain`, `gift` ← `joinmember`) があればその設定、無ければ `defaultTrueKeys` に入っているかで決まる。

---

## 8. storage (保存データ)

```mermaid
flowchart LR
  subgraph S["chrome.storage.local"]
    K1["@config<br/>Config.toPlain()"]
    K2["@videos<br/>Video.toPlain()[]<br/>最近見た順・最大 maxVideoLength 件"]
    K3["動画 ID (11 文字)<br/>Chat.toPlain()[]"]
  end

  PE["PageEventer.loadConfig"] -- "読む" --> K1
  BGA["background.applyConfig"] -- "読む" --> K1
  OPT["設定画面"] -- "読む・書く" --> K1
  POPS["popup.handleSaveToMerge"] -- "読む" --> K1

  LV["PageEventer.loadVideo<br/>→ VideoStorage.save<br/>(最大同接・再生数は前回から引き継ぐ)"] -- "書く" --> K2
  WV["PageEventer.startWatchViewers<br/>→ VideoStorage.updateMaxViewers"] -- "書く" --> K2
  VSS["VideoStorage.save"] -- "溢れた動画のチャットを消す<br/>ChatStorage.clear" --> K3
  POP["popup"] -- "読む" --> K2

  SQ["SaveChatQueue.invoke<br/>→ ChatStorage.save"] -- "書く" --> K3
  CH["ChatHandler.setVideo"] -- "画像化済み ID を読む" --> K3
  POP -- "読む・削除" --> K3
```

| 関数 | 何をするか |
| :-- | :-- |
| `VideoStorage.save(video, maxLength)` | 同じ ID は置き換え (作成日時と、`Video.mergeMaxStats` で最大同接・最大再生数を引き継ぐ) → 先頭に追加 → `updatedAt` の新しい順に並べて `maxLength` 件に切る → 溢れた動画のチャットを `ChatStorage.clear` |
| `ChatStorage.save(videoId, chats)` | 同じ ID は置き換え (作成日時と、新しい方に画像が無ければ古い画像を引き継ぐ) → 無ければ末尾に追加 |
| `ChatStorage.remove(videoId, chats)` | 渡された ID のチャットを消す |
| `Config.fromPlain` / `Video.fromPlain` / `Chat.fromPlain` | `Object.assign(new X(), plain)` で初期値を補い、日時 (epoch msec) を `Date` に戻す |
| `xxx.toPlain()` | 日時を epoch msec にした plain object にする (v1 と同じ形式) |

---

## 9. 関数一覧 (呼び出し元つき)

### content script

| 関数 | 呼び出し元 | 受け取る → 返す / 渡す先 |
| :-- | :-- | :-- |
| `PageEventer.init` | `content-script.ts` | — → `loadConfig`, `onPageUpdated` |
| `PageEventer.loadConfig` | `init` | `ConfigStorage.get()` → `chatFilter.setChatFilters`, `handler.setDrawOnce` |
| `PageEventer.onPageUpdated` | `init`, `yt-page-data-updated` イベント | — → `loadVideo`, `attachChatFrame` |
| `PageEventer.loadVideo` | `onPageUpdated` | URL → `VideoData` (開いた時点の同接 `concurrentViewers` を含む. page-bridge が `ytd-watch-flexy.data` から `parseConcurrentViewers` で取る) → `Video` → `VideoStorage.save` |
| `PageEventer.startWatchViewers` | `onPageUpdated` (配信中のみ) | `#view-count` の aria-label → `VideoParser.parseConcurrentViewers` → 最大を超えたら `VideoStorage.updateMaxViewers`. 遷移時に `stopWatchViewers` |
| `PageEventer.attachChatFrame` | `onPageUpdated`, `removalObserver` | `document` → `iframe` → `connectChat` |
| `PageEventer.onIframeLoad` | iframe の `load` イベント | `iframe` → `connectChat` |
| `PageEventer.connectChat` | `attachChatFrame`, `onIframeLoad` | `iframe` → `#item-scroller` → `handler.setVideo`, `chatObserver.observe`, `handler.findInvoke` |
| `PageEventer.disconnect` | `onPageUpdated`, `removalObserver` | — → `handler.removeVideo` |
| `ChatHandler.setVideo` | `connectChat` | `Video` → `SaveChatQueue.setVideo`, `ChatStorage.get` → `DrawDomQueue.setDrawnIds` |
| `ChatHandler.invoke` | `chatObserver`, `findInvoke` | `Node` → `ChatParser.parse` → `Chat` → `checkChatTaskType` → キュー |
| `ChatHandler.findInvoke` | `connectChat` (`captureInitialChats` の時) | `Element` → 中のチャット要素を全て `invoke` |
| `ChatParser.parse` | `ChatHandler.invoke` | `(Video, Element)` → `Chat` |
| `ChatFilter.setChatFilters` | `PageEventer.loadConfig`, `ChatFilterTable.handleFilterTest` | `ChatFilterConfigInterface[]` → 判定用フィルター |
| `ChatFilter.checkChatTaskType` | `ChatHandler.invoke` | `Chat` → `'image' \| 'save' \| false` |
| `DrawDomQueue.invoke` | `BaseQueue.exec` | `{ node, chat }[]` → `NodeToPng.generateChatImageUrl` → `SaveChatQueue.push` |
| `SaveChatQueue.invoke` | `BaseQueue.exec` | `Chat[]` → `ChatStorage.save`, `BadgeManager.addBadgeCounter` |
| `NodeToPng.generateChatImageUrl` | `DrawDomQueue.invoke` | `HTMLElement` → style を一時変更 → `getEmbeddedFontCss` → `generate` → data url |
| `getEmbeddedFontCss` (`WebFontEmbedder.ts`) | `NodeToPng.generateChatImageUrl` | iframe の `Document` → Google Fonts の CSS を fetch → latin のフォントを data url にした CSS (初回のみ作成, 以降は使い回し) |
| `NodeToPng.generate` | `generateChatImageUrl`, popup `generateOriginalImage` | `(HTMLElement, { strict, fontCss })` → modern-screenshot `domToCanvas` → 透明部分を切り取り → png data url |
| `PageHelper.getPageVideoId` | `loadVideo`, popup の `VideoDropdown` | URL → 動画 ID |
| `PageHelper.requestVideoData` | `loadVideo` (retry) | 動画 ID → postMessage → `VideoData \| null` |
| `BadgeManager.*` | `PageEventer`, `SaveChatQueue`, `content-script.ts` | → `Runtime.sendBadgeText` / `sendIconState` |

### page-bridge / background

| 関数 | 呼び出し元 | 受け取る → 返す / 渡す先 |
| :-- | :-- | :-- |
| `findVideoData` (page-bridge) | message リスナー | 動画 ID → `playerResponseCandidates` → `parsePlayerResponse` → `VideoData \| null` |
| `parsePlayerResponse` | `findVideoData` | ページの `playerResponse` → `VideoData` |
| `handleMessage` (background) | `listenMessages` | `BackgroundMessage` → `chrome.action.*` / `applyConfig` |
| `applyConfig` (background) | 起動時, `YCR_LOAD_CONFIG` | `ConfigStorage.get()` → `Config.applyToRuntime` |

### popup / 設定画面

| 関数 | 呼び出し元 | 受け取る → 返す / 渡す先 |
| :-- | :-- | :-- |
| `handleVideoChange` | `VideoDropdown` の `change` | `Video` → `reloadChats` |
| `reloadChats` | `handleVideoChange`, 削除の後 | → `ChatStorage.get` → `chats` |
| `toggleSortOrder` | 並び順ボタン | → `sortOrder`, localStorage |
| `handleSaveCsv` | 「CSV で保存」 | `selectedChats` → `ChatCsv.createObjectURL` → `Filer.downloadFile` |
| `handleSaveToMerge` | 「画像をつなげて保存」 | `selectedChats` → `NodeToPng.merge` → `Filer.downloadImage` |
| `generateOriginalImage` | `handleSaveToMerge` | `Chat` → popup 上の要素 → `NodeToPng.generate` |
| `loadConfig` (設定画面) | `onMounted`, 保存・取り消し・インポートの後 | `ConfigStorage.get` → `form`, `saved` |
| `handleSave` | 「保存する」 | `form` → `Config` → `ConfigStorage.save` |
| `handleExportAllCsv` | 「CSV で出力」 | `VideoStorage.getAll` + `ChatStorage.get` → `ChatCsv.createManyObjectURL` |
| `ChatCsv.generateMany` | `generate`, `createManyObjectURL` | `{ video, chats }[]` → CSV 文字列 (BOM + CRLF) |

---

## 10. 分岐に使う定数・設定値

### コード内の定数

| 定数 | 場所 | 値 | 何に使うか / 変えると何が変わるか |
| :-- | :-- | :-- | :-- |
| `PAGE_UPDATED_EVENT` | `PageEventer.ts` | `'yt-page-data-updated'` | YouTube の SPA 遷移を検知するイベント |
| `CHAT_FRAME_SELECTOR` / `CHAT_IFRAME_SELECTOR` | `PageEventer.ts` | `ytd-live-chat-frame#chat` / `iframe#chatframe` | チャット欄の iframe を探す |
| `CHAT_SCROLLER_SELECTOR` | `PageEventer.ts` | `yt-live-chat-item-list-renderer #item-scroller` | チャットの追加を監視する要素 |
| `VIEW_COUNT_SELECTOR` | `PageEventer.ts` | `#view-count[aria-label]` | 配信中の「〇人が視聴中」 |
| `VIEWERS_INTERVAL` | `PageEventer.ts` | `30000` (msec) | 同時接続数を読む間隔 (表示の変化を監視できなかった時の予備) |
| `VIEWERS_THROTTLE` | `PageEventer.ts` | `2000` (msec) | 同時接続数の表示が変わってから読むまでの待ち (回転中に何度も読まない) |
| `CHAT_NODE_NAMES` | `ChatParser.ts` | text / paid / membership / sticker / ギフト (gift-purchase-announcement) の renderer | `ChatHandler.invoke` が処理するタグ名 |
| `BASE_FILTERS` | `ChatFilter.ts` | [4-2 の表](#4-2-chatfiltercheckstuckchatfilter-保存するか画像化するか) | チャットの種類の判定 |
| `INHERIT_FILTER_KEYS` | `ChatFilter.ts` | `milestone ← joinmember`, `topchat ← plain`, `screply ← plain`, `gift ← joinmember` | 後から追加したフィルターの初期値の引き継ぎ元 |
| `defaultTrueKeys` | `ChatFilter.ts` | `owner`, `verified`, `moderator` | 初期設定で「保存する」「画像化する」をオンにするもの |
| `warnFilterKeys` | `ChatFilter.ts` | `plain`, `member` | 設定画面で「負荷注意」を出すもの |
| `COUNT_TO_PROCESS_AT_ONE` | `BaseQueue.ts` | `10` | キューが一度に処理する件数 |
| `PROCESS_INTERVAL` | `BaseQueue.ts` | `1000` (ms) | 処理中に溜まった分を処理する間隔 |
| `MESSAGE_TYPES` | `messages.ts` | `YCR_*` 4 種 | 受け付けるメッセージ (それ以外は無視) |
| `ICONS` | `background.ts` | `active` / `waiting` / `inactive` → アイコン画像 | アイコンの色 |
| `BRIDGE_REQUEST_SOURCE` / `BRIDGE_RESPONSE_SOURCE` | `bridge/protocol.ts` | `'ycr:content'` / `'ycr:bridge'` | postMessage の送り主の判定 |
| `MIN_VIDEO_LENGTH` | `models/Config.ts` | `5` | 動画の最大保存数の下限 |
| `CSV_FILENAME` | `popup/App.vue` | `'%title%_チャット_%now%'` | popup の CSV のファイル名 |
| `FORMULA_PREFIX` | `ChatCsv.ts` | `= + - @ タブ 改行` で始まる | CSV で先頭に `'` を付ける値 |
| `LEVELS` | `Logger.ts` | silent 〜 all | ログを出すかの判定 (`SHOW_LOG_LEVEL` 以上だけ出す) |

### 待ち時間・再試行

| 場所 | 回数 × 間隔 | 失敗すると |
| :-- | :-- | :-- |
| `loadVideo` の `requestVideoData` | 15 回 × 500ms (1 回の応答待ち 1000ms) | エラー (アイコンはグレー) |
| `attachChatFrame` の iframe 探し | 10 回 × 1000ms (`retry` の初期値) | 警告 (チャットが無効・非表示) |
| `connectChat` の `#item-scroller` 探し | 10 回 × 1000ms | エラー |
| `ChatParser.parse` の投稿者名・ステッカー | 3 回 × 300ms | 空のまま保存 |

### 設定値 (`Config`)

| 設定 | 初期値 | 読む関数 | 分岐 |
| :-- | :-- | :-- | :-- |
| `runScript` | `true` | `PageEventer.init` | `false` なら何もしない |
| `chatFilters` | `generateDefaultChatfilterConfigs()` | `PageEventer.loadConfig` → `ChatFilter.setChatFilters` | 保存する / 画像化するの判定 |
| `ignoreSimpleVideo` | `false` | `PageEventer.loadVideo` | `true` かつ普通の動画なら保存しない |
| `maxVideoLength` | `20` | `PageEventer.loadVideo` → `VideoStorage.save` | 超えた古い動画をチャットごと消す |
| `chatDrawOnce` | `true` | `PageEventer.loadConfig` → `ChatHandler.setDrawOnce` | 画像化済みの ID なら撮り直さない |
| `captureInitialChats` | `false` | `PageEventer.connectChat` | `true` なら表示済みのチャットも `findInvoke` |
| `complementImage` | `false` | popup `handleSaveToMerge` | 画像が無いチャットを独自に画像化 |
| `generateOriginalImage` | `false` | popup `handleSaveToMerge` | 全て独自に画像化 |
| `mergeImageFileName` | `'%now%'` | `Config.formatFilename` → `FilenameFormatter.format` | つなげた画像のファイル名 |
| `showLogLevel` | `'warn'` | `Config.applyToRuntime` → `Logger.setLevel` | 出すログ |

---

## 11. ビルド

```mermaid
flowchart LR
  B(["npm run build<br/>scripts/build.js"]) --> R["dist/ を削除"]
  R --> P["Vite: pagesConfig()<br/>popup.html / options.html / background.ts<br/>(ES module, 共通部分は assets/ に分割)"]
  P --> EA["extensionAssetsPlugin<br/>manifest.json (version ← package.json)<br/>readme/index.html (docs/readme.md を marked で変換)"]
  R --> C1["Vite: contentScriptConfig()<br/>content-script.ts → content-script.js (IIFE)"]
  R --> C2["Vite: contentScriptConfig()<br/>page-bridge.ts → page-bridge.js (IIFE)"]
  P & EA & C1 & C2 --> D[("dist/")]
  D --> Z["npm run build-zip<br/>scripts/build-zip.js → dist-zip/*.zip"]
```

content script は ES module を読み込めないため、1 ファイルにまとめた IIFE として別にビルドしている。
