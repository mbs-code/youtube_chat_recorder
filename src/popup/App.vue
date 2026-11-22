<template>
  <div class="flex min-h-150 flex-col">
    <header class="sticky top-0 z-30 flex h-[49px] items-center gap-1 border-b border-zinc-200 bg-white pr-3 pl-4">
      <img class="mr-1.5 size-5" src="/icons/icon-32x32.png" alt="" />
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
      <VideoDropdown :videos="videos" @change="handleVideoChange" />

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

      <section v-if="selectedVideo" class="flex flex-col gap-2.5">
        <!-- 49px = header の高さ -->
        <div class="sticky top-[49px] z-10 -mx-4 flex items-center gap-2 bg-zinc-50 px-4 py-2">
          <select v-model="selectedFilterKey" class="select h-7 w-47.5 text-xs" aria-label="表示するチャット">
            <option v-for="filter in chatFilters" :key="filter.key" :value="filter.key">
              {{ filter.title }}
            </option>
          </select>
          <span class="flex-1 text-xs">
            <strong class="text-sm text-zinc-950">{{ sortedChats.length }}</strong>
            件
            <span v-if="sortedChats.length !== chats.length" class="text-zinc-500">/ 全 {{ chats.length }} 件</span>
          </span>
          <button class="btn btn-secondary btn-sm" :disabled="filteredChats.length === 0" @click="selectedChats = [...filteredChats]">
            すべて選択
          </button>
          <button class="btn btn-secondary btn-sm" :disabled="selectedChats.length === 0" @click="selectedChats = []">選択解除</button>
        </div>

        <p v-if="isOver" class="notice notice-warning">
          <i class="mdi mdi-alert-outline" />
          表示できるのは {{ MAX_CHAT_LENGTH }} 件までです。上の選択欄で絞り込んでください。
        </p>

        <ChatList v-if="filteredChats.length" v-model:selected="selectedChats" :chats="filteredChats" />
        <div v-else class="flex flex-col items-center gap-1 px-4 py-12 text-center">
          <i class="mdi mdi-message-text-outline mb-1 text-4xl text-zinc-400" />
          <p>記録したチャットはありません</p>
          <p class="text-xs text-zinc-500">記録するチャットの種類は「設定」で変えられます。</p>
        </div>
      </section>

      <div v-else class="flex flex-col items-center gap-1 px-4 py-12 text-center">
        <i class="mdi mdi-youtube mb-1 text-4xl text-zinc-400" />
        <p>まだ記録した動画がありません</p>
        <p class="text-xs text-zinc-500">YouTube でライブ配信やアーカイブを開くと、自動でチャットを記録します。</p>
      </div>
    </main>

    <footer v-if="selectedVideo" class="sticky bottom-0 z-30 flex items-center gap-2 border-t border-zinc-200 bg-white px-4 py-2.5">
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
import { computed, onMounted, ref, shallowRef } from 'vue'
import ChatFilter from '../lib/chatFilter/ChatFilter'
import BrowserTabs from '../lib/chrome/BrowserTabs'
import Filer from '../lib/chrome/Filer'
import Runtime from '../lib/chrome/Runtime'
import ChatStorage from '../lib/chrome/storage/ChatStorage'
import ConfigStorage from '../lib/chrome/storage/ConfigStorage'
import VideoStorage from '../lib/chrome/storage/VideoStorage'
import ChatCsv from '../lib/util/ChatCsv'
import FilenameFormatter from '../lib/util/FilenameFormatter'
import NodeToPng from '../lib/util/NodeToPng'
import type Chat from '../models/Chat'
import type Video from '../models/Video'
import ChatList from './components/ChatList.vue'
import VideoDropdown from './components/VideoDropdown.vue'

const MAX_CHAT_LENGTH = 100 // 最大表示チャット数

const videos = shallowRef<Video[]>([])
const selectedVideo = shallowRef<Video | null>(null)

const chats = shallowRef<Chat[]>([])
const selectedChats = ref<Chat[]>([])

const chatFilters = ChatFilter.generatePopupChatFilters()
const selectedFilterKey = ref(chatFilters[0].key)

const isSaving = ref(false)

const CSV_FILENAME = '%title%_チャット_%now%'

/** フィルター & 時間順ソート済みのチャット. */
const sortedChats = computed(() => {
  const chatFilter = chatFilters.find(c => c.key === selectedFilterKey.value)
  const filtered = chatFilter?.func ? chats.value.filter(chatFilter.func) : chats.value
  return [...filtered].sort((a, b) => (a.seconds ?? 0) - (b.seconds ?? 0))
})
const isOver = computed(() => sortedChats.value.length > MAX_CHAT_LENGTH)
const filteredChats = computed(() => sortedChats.value.slice(0, MAX_CHAT_LENGTH))

onMounted(async () => {
  // 開いているタブのバッジをリセットする (content script が居なければ何もしない)
  const activeTab = await BrowserTabs.getActiveTab()
  if (activeTab?.id !== undefined) void Runtime.sendResetBadge(activeTab.id)

  videos.value = await VideoStorage.getAll()
})

async function reloadChats(): Promise<void> {
  const videoId = selectedVideo.value?.id
  chats.value = videoId ? await ChatStorage.get(videoId) : []
  selectedChats.value = []
}

async function handleVideoChange(video: Video | null): Promise<void> {
  selectedVideo.value = video
  await reloadChats()
}

async function handleOpenUrl(url?: string): Promise<void> {
  if (!url) return
  // 現在表示されているページなら開かない
  const activeTab = await BrowserTabs.getActiveTab()
  if (url !== activeTab?.url) {
    await BrowserTabs.windowOpen(url, activeTab)
  }
}

async function handleDeleteChats(video: Video): Promise<void> {
  // 動画を削除すると色々と不都合なので、全チャットのみ削除する
  if (video.id && window.confirm(`「${video.title}」のチャットを全て削除します。\nこの操作は元に戻せません。`)) {
    await ChatStorage.clear(video.id)
    await reloadChats()
  }
}

async function handleDeleteSelectedChats(): Promise<void> {
  const videoId = selectedVideo.value?.id
  const selected = selectedChats.value
  if (
    videoId &&
    selected.length > 0 &&
    window.confirm(`選択した ${selected.length} 件のチャットを削除します。\nこの操作は元に戻せません。`)
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
        '画像があるチャットが選択されていません。\n画像が無いチャットも保存したい場合は、設定の「取得できていないチャット画像を独自に生成する」をオンにしてください。'
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
