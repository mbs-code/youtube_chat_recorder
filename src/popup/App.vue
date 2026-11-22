<template>
  <div class="flex min-h-150 flex-col">
    <!-- ヘッダー: アプリ名と「使い方」「設定」 -->
    <header class="sticky top-0 z-30 flex h-12.25 items-center gap-1 border-b border-zinc-200 bg-white pr-3 pl-4">
      <img class="mr-1.5 size-5" src="/icons/icon-32x32.png" alt="">
      <h1 class="flex-1 font-bold text-zinc-950">Youtube Chat Recorder</h1>
      <button class="btn btn-ghost btn-sm" title="使い方" @click="Runtime.openReadmePage()">
        <i class="mdi mdi-help-circle-outline" />
        使い方
      </button>
      <button class="btn btn-ghost btn-sm" title="設定" @click="Runtime.openOptionPage()">
        <i class="mdi mdi-cog-outline" />
        設定
      </button>
    </header>

    <main class="flex flex-1 flex-col gap-3 p-4">
      <!-- 動画の選択欄 -->
      <VideoDropdown :videos="videos" @change="handleVideoChange" />

      <!-- 選んだ動画への操作 -->
      <div v-if="selectedVideo" class="-mt-1.5 flex items-center gap-0.5">
        <button class="btn btn-ghost btn-sm" :disabled="!selectedVideo.url" @click="handleOpenUrl(selectedVideo.url)">
          <i class="mdi mdi-open-in-new" />
          動画を開く
        </button>
        <button class="btn btn-ghost btn-sm" :disabled="!selectedVideo.thumbnailUrl" @click="handleOpenUrl(selectedVideo.thumbnailUrl)">
          <i class="mdi mdi-image-outline" />
          サムネイル
        </button>
        <button
          class="btn btn-ghost btn-sm ml-auto enabled:hover:bg-danger-soft enabled:hover:text-danger"
          :disabled="chats.length === 0"
          @click="handleDeleteChats(selectedVideo)"
        >
          <i class="mdi mdi-delete-outline" />
          この動画のチャットを全て削除
        </button>
      </div>

      <!-- タブ: チャット / 記録・グラフ (チャットの一覧がすぐ見えるように、記録は別のタブにする) -->
      <nav v-if="selectedVideo" class="-mx-4 flex gap-1 border-b border-zinc-200 px-4" role="tablist">
        <button
          v-for="item in TABS"
          :key="item.key"
          role="tab"
          :aria-selected="tab === item.key"
          class="-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm"
          :class="tab === item.key ? 'border-zinc-900 font-bold text-zinc-950' : 'border-transparent text-zinc-500 hover:text-zinc-800'"
          @click="setTab(item.key)"
        >
          <i class="mdi" :class="item.icon" />
          {{ item.label }}
          <span v-if="item.key === 'chats'" class="badge">{{ chats.length }}</span>
        </button>
      </nav>

      <!-- 記録・グラフのタブ: 最大同接・最大再生数・スーパーチャット合計と、推移のグラフ -->
      <section v-if="selectedVideo && tab === 'stats'" class="flex flex-col gap-3">
        <p class="help">
          <i class="mdi mdi-information-outline" />
          ページを開いている間に、画面に表示された数字・チャットをもとに数えています。開いていない間の分はありません。
        </p>
        <VideoStats :video="selectedVideo" :chats="chats" />
        <template v-if="recordStats">
          <TimelineChart
            :points="timeline"
            :chats="chats"
            :start-date="selectedVideo.startDate"
            :end-date="selectedVideo.endDate"
          />
          <ViewCountChart :points="viewCounts" :start-date="selectedVideo.startDate" />
          <p v-if="timeline.length === 0 && viewCounts.length === 0" class="py-6 text-center text-xs text-zinc-500">推移の記録はありません</p>
        </template>
      </section>

      <!-- チャットのタブ -->
      <section v-else-if="selectedVideo" class="flex flex-col gap-2.5">
        <!-- ツールバー: 絞り込み・件数・並び順・まとめて選択 (スクロールしても上に残る. top の 12.25 (49px) は header の高さ) -->
        <div class="sticky top-12.25 z-10 -mx-4 flex items-center gap-2 bg-zinc-50 px-4 py-2">
          <FilterDropdown v-model="selectedFilterKey" :options="filterOptions" />
          <span class="flex-1 text-xs">
            <strong class="text-sm text-zinc-950">{{ sortedChats.length }}</strong>
            件
            <span v-if="sortedChats.length !== chats.length" class="text-zinc-500">/ 全 {{ chats.length }} 件</span>
          </span>
          <button
            class="btn btn-secondary btn-sm"
            :title="sortOrder === 'asc' ? '古い順 (クリックで新しい順)' : '新しい順 (クリックで古い順)'"
            @click="toggleSortOrder"
          >
            <i class="mdi" :class="sortOrder === 'asc' ? 'mdi-sort-clock-ascending-outline' : 'mdi-sort-clock-descending-outline'" />
            {{ sortOrder === 'asc' ? '古い順' : '新しい順' }}
          </button>
          <button class="btn btn-secondary btn-sm" :disabled="sortedChats.length === 0" @click="selectedChats = [...sortedChats]">
            すべて選択
          </button>
          <button class="btn btn-secondary btn-sm" :disabled="selectedChats.length === 0" @click="selectedChats = []">選択解除</button>
        </div>

        <!-- チャットの一覧 (無ければ案内) -->
        <ChatList v-if="sortedChats.length" v-model:selected="selectedChats" :chats="sortedChats" />
        <div v-else class="flex flex-col items-center gap-1 px-4 py-12 text-center">
          <i class="mdi mdi-message-text-outline mb-1 text-4xl text-zinc-400" />
          <p>記録したチャットはありません</p>
          <p class="text-xs text-zinc-500">記録するチャットの種類は「設定」で変えられます。</p>
        </div>
      </section>

      <!-- 動画がまだ 1 本も無い時の案内 -->
      <div v-if="!selectedVideo" class="flex flex-col items-center gap-1 px-4 py-12 text-center">
        <i class="mdi mdi-youtube mb-1 text-4xl text-zinc-400" />
        <p>まだ記録した動画がありません</p>
        <p class="text-xs text-zinc-500">YouTube でライブ配信やアーカイブを開くと、自動でチャットを記録します。</p>
      </div>
    </main>

    <!-- フッター: 選択中のチャットへの操作 (常に下に残る) -->
    <footer
      v-if="selectedVideo && tab === 'chats'"
      class="sticky bottom-0 z-30 flex items-center gap-2 border-t border-zinc-200 bg-white px-4 py-2.5"
    >
      <span class="flex-1">
        <template v-if="selectedChats.length">
          <strong class="text-[15px] text-zinc-950">{{ selectedChats.length }}</strong>
          件を選択中
        </template>
        <span v-else class="text-zinc-500">チャットをクリックして選択</span>
      </span>
      <button class="btn btn-danger" :disabled="selectedChats.length === 0" @click="handleDeleteSelectedChats">
        <i class="mdi mdi-delete-outline" />
        削除
      </button>
      <button class="btn btn-secondary" :disabled="selectedChats.length === 0" title="選択したチャットを CSV で保存" @click="handleSaveCsv">
        <i class="mdi mdi-file-delimited-outline" />
        CSV で保存
      </button>
      <button class="btn btn-primary" :disabled="selectedChats.length === 0 || isSaving" @click="handleSaveToMerge">
        <i class="mdi" :class="isSaving ? 'mdi-loading mdi-spin' : 'mdi-download'" />
        画像をつなげて保存
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
/**
 * popup (ツールバーのアイコンをクリックした画面).
 *
 * - 最近見た動画を選び、記録したチャットを一覧で見る.
 * - 選んだチャットを削除・CSV で保存・画像をつなげて保存する.
 * - 開いた時に、開いているタブのバッジ (取得数) をリセットする.
 */
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import ChatFilter from '../lib/chatFilter/ChatFilter'
import BrowserTabs from '../lib/chrome/BrowserTabs'
import Filer from '../lib/chrome/Filer'
import Runtime from '../lib/chrome/Runtime'
import ChatStorage from '../lib/chrome/storage/ChatStorage'
import ConfigStorage from '../lib/chrome/storage/ConfigStorage'
import TimelineStorage from '../lib/chrome/storage/TimelineStorage'
import VideoStorage from '../lib/chrome/storage/VideoStorage'
import ChatCsv from '../lib/util/ChatCsv'
import FilenameFormatter from '../lib/util/FilenameFormatter'
import NodeToPng from '../lib/util/NodeToPng'
import Chat from '../models/Chat'
import type Video from '../models/Video'
import ChatList from './components/ChatList.vue'
import VideoDropdown from './components/VideoDropdown.vue'
import VideoStats from './components/VideoStats.vue'
import TimelineChart from './components/TimelineChart.vue'
import ViewCountChart from './components/ViewCountChart.vue'
import FilterDropdown from './components/FilterDropdown.vue'
import type { TimelinePoint, ViewCountPoint } from '../models/Timeline'

/** 最近見た動画. */
const videos = shallowRef<Video[]>([])
/** 選んでいる動画. */
const selectedVideo = shallowRef<Video | null>(null)

/** 選んでいる動画の全チャット (絞り込み前). */
const chats = shallowRef<Chat[]>([])
/** 選んでいる動画の推移 (1 分ごとの同時接続数・コメント数). */
const timeline = shallowRef<TimelinePoint[]>([])
/** 選んでいる動画の再生数の記録. */
const viewCounts = shallowRef<ViewCountPoint[]>([])
/** 推移を記録・表示するか (設定). */
const recordStats = ref(true)

/** 選択中のチャット (選択した順). */
const selectedChats = ref<Chat[]>([])

/** 絞り込みの選択肢と、選んでいるもの. */
const chatFilters = ChatFilter.generatePopupChatFilters()
const selectedFilterKey = ref(chatFilters[0].key)

type SortOrder = 'asc' | 'desc'
/** 並び順を覚えておく localStorage の key. */
const SORT_ORDER_KEY = 'ycr:popup:sortOrder'

/** 前回の並び順を読み込む (読めなければ古い順). */
function loadSortOrder(): SortOrder {
  try {
    return localStorage.getItem(SORT_ORDER_KEY) === 'desc' ? 'desc' : 'asc'
  } catch {
    return 'asc'
  }
}

type Tab = 'chats' | 'stats'
/** タブ. */
const TABS: { key: Tab, label: string, icon: string }[] = [
  { key: 'chats', label: 'チャット', icon: 'mdi-message-text-outline' },
  { key: 'stats', label: '記録・グラフ', icon: 'mdi-chart-line' },
]
/** 開いているタブを覚えておく localStorage の key. */
const TAB_KEY = 'ycr:popup:tab'

/** 前回のタブを読み込む (読めなければチャット). */
function loadTab(): Tab {
  try {
    return localStorage.getItem(TAB_KEY) === 'stats' ? 'stats' : 'chats'
  } catch {
    return 'chats'
  }
}

/** 開いているタブ. 次に開いたときも同じタブにする. */
const tab = ref<Tab>(loadTab())

function setTab(value: Tab): void {
  tab.value = value
  try {
    localStorage.setItem(TAB_KEY, value)
  } catch {
    // 覚えられなくても切り替え自体はできる
  }
}

/** 画像をつなげて保存している最中か. */
const isSaving = ref(false)

/** CSV のファイル名 (FilenameFormatter の書式). */
const CSV_FILENAME = '%title%_チャット_%now%'

/** 並び順 (asc: 古い順, desc: 新しい順). 次に開いたときも同じ並び順にする. */
const sortOrder = ref<SortOrder>(loadSortOrder())

/** 古い順 / 新しい順を切り替えて覚えておく. */
function toggleSortOrder(): void {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  try {
    localStorage.setItem(SORT_ORDER_KEY, sortOrder.value)
  } catch {
    // 保存できなくても並び替え自体はできる
  }
}

/** 絞り込みの選択肢 (それぞれに当てはまる件数付き). */
const filterOptions = computed(() => chatFilters.map(filter => ({
  key: filter.key,
  title: filter.title,
  count: filter.func ? chats.value.filter(filter.func).length : chats.value.length,
})))

/** フィルター & 並び替え済みのチャット. */
const sortedChats = computed(() => {
  const chatFilter = chatFilters.find(c => c.key === selectedFilterKey.value)
  const filtered = chatFilter?.func ? chats.value.filter(chatFilter.func) : chats.value
  const sorted = [...filtered].sort(Chat.compareByTime)
  return sortOrder.value === 'desc' ? sorted.reverse() : sorted
})

onMounted(async () => {
  void ConfigStorage.get().then(config => (recordStats.value = config.recordStats))
  // 開いているタブのバッジをリセットする (content script が居なければ何もしない)
  const activeTab = await BrowserTabs.getActiveTab()
  if (activeTab?.id !== undefined) void Runtime.sendResetBadge(activeTab.id)

  videos.value = await VideoStorage.getAll()
  chrome.storage.onChanged.addListener(onStorageChanged)
})

onUnmounted(() => chrome.storage.onChanged.removeListener(onStorageChanged))

/**
 * 開いている間に記録された内容を反映する. (配信中は同時接続数・チャットが増えていく)
 *
 * - 動画一覧 (@videos) が変わったら、選んでいる動画の情報 (最大同接など) だけ差し替える.
 *   (一覧ごと差し替えると選択欄が選び直されてしまうため)
 * - 選んでいる動画のチャットが変わったら読み込み直す. 選択中のチャットはそのまま残す.
 */
async function onStorageChanged(changes: Record<string, chrome.storage.StorageChange>, area: string): Promise<void> {
  const videoId = selectedVideo.value?.id
  if (area !== 'local' || !videoId) return

  if (changes[VideoStorage.STORAGE_KEY]) {
    const updated = await VideoStorage.get(videoId)
    if (updated && selectedVideo.value?.id === videoId) selectedVideo.value = updated
  }
  if (changes[TimelineStorage.key(videoId)]) {
    const latest = await TimelineStorage.get(videoId)
    if (selectedVideo.value?.id === videoId) timeline.value = latest
  }
  if (changes[TimelineStorage.viewsKey(videoId)]) {
    const latest = await TimelineStorage.getViews(videoId)
    if (selectedVideo.value?.id === videoId) viewCounts.value = latest
  }
  if (changes[videoId]) {
    const selectedIds = new Set(selectedChats.value.map(c => c.id))
    const latest = await ChatStorage.get(videoId)
    if (selectedVideo.value?.id !== videoId) return
    chats.value = latest
    selectedChats.value = selectedChats.value
      .map(s => latest.find(c => c.id === s.id))
      .filter((c): c is Chat => c !== undefined && selectedIds.has(c.id))
  }
}

/** 選んでいる動画のチャットを読み込み直す (選択は解除). */
async function reloadChats(): Promise<void> {
  const videoId = selectedVideo.value?.id
  chats.value = videoId ? await ChatStorage.get(videoId) : []
  timeline.value = videoId ? await TimelineStorage.get(videoId) : []
  viewCounts.value = videoId ? await TimelineStorage.getViews(videoId) : []
  selectedChats.value = []
}

/** 動画の選択欄で動画が選ばれた. */
async function handleVideoChange(video: Video | null): Promise<void> {
  selectedVideo.value = video
  await reloadChats()
}

/** 動画ページやサムネイルを新しいタブで開く. */
async function handleOpenUrl(url?: string): Promise<void> {
  if (!url) return
  // 現在表示されているページなら開かない
  const activeTab = await BrowserTabs.getActiveTab()
  if (url !== activeTab?.url) {
    await BrowserTabs.windowOpen(url, activeTab)
  }
}

/** 選んでいる動画のチャットを全て削除する. */
async function handleDeleteChats(video: Video): Promise<void> {
  // 動画を削除すると色々と不都合なので、全チャットのみ削除する
  if (video.id && window.confirm(`「${video.title}」のチャットを全て削除します。\nこの操作は元に戻せません。`)) {
    await ChatStorage.clear(video.id)
    await reloadChats()
  }
}

/** 選択中のチャットを削除する. */
async function handleDeleteSelectedChats(): Promise<void> {
  const videoId = selectedVideo.value?.id
  const selected = selectedChats.value
  if (
    videoId
    && selected.length > 0
    && window.confirm(`選択した ${selected.length} 件のチャットを削除します。\nこの操作は元に戻せません。`)
  ) {
    await ChatStorage.remove(videoId, selected)
    await reloadChats()
  }
}

/** チャット画像を popup 上の要素から独自に生成する. */
async function generateOriginalImage(chat: Chat): Promise<string | undefined> {
  const node = document.querySelector<HTMLElement>(`.app-chat[data-chatid="${CSS.escape(chat.id ?? '')}"] .app-chat-main`)
  return node ? await NodeToPng.generate(node) : undefined
}

/** 選択したチャットを CSV で保存する (投稿時間順). */
function handleSaveCsv(): void {
  const video = selectedVideo.value
  const targets = selectedChats.value
  if (!video || targets.length === 0) return

  const url = ChatCsv.createObjectURL(video, targets)
  Filer.downloadFile(url, FilenameFormatter.format(CSV_FILENAME, video, targets) + '.csv')
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * 選択中のチャットの画像を縦につなげて PNG で保存する.
 *
 * - 設定によっては、画像が無いチャット (または全て) を popup 上の表示から独自に画像化する.
 */
async function handleSaveToMerge(): Promise<void> {
  const video = selectedVideo.value
  const selected = selectedChats.value // 選択した順に結合する
  if (!video || selected.length === 0) return

  isSaving.value = true
  try {
    const config = await ConfigStorage.get()

    const urls: string[] = []
    for (const chat of selected) {
      let url: string | undefined
      if (config.generateOriginalImage) {
        url = await generateOriginalImage(chat) // 全てを独自で描画するモード
      } else if (chat.pngUrl) {
        url = chat.pngUrl
      } else if (config.complementImage) {
        url = await generateOriginalImage(chat) // 無いものだけ独自で描画するモード
      }
      if (url) urls.push(url)
    }

    if (urls.length === 0) {
      throw new Error(
        '画像があるチャットが選択されていません。\n画像が無いチャットも保存したい場合は、設定の「取得できていないチャット画像を独自に生成する」をオンにしてください。',
      )
    }

    const filename = config.formatFilename(video, selected)
    const mergeUrl = await NodeToPng.merge(urls)
    Filer.downloadImage(mergeUrl, filename)
  } catch (err) {
    window.alert(err instanceof Error ? err.message : String(err))
  } finally {
    isSaving.value = false
  }
}
</script>

<style>
html {
  width: 600px;
  height: 600px;
}
</style>
