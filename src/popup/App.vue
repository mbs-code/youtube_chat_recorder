<template>
  <section class="section">
    <div class="field">
      <VideoDropdown :videos="videos" @change="handleVideoChange" @close="scrollToTop" />
    </div>

    <div class="field is-grouped">
      <div class="control">
        <div class="select">
          <select v-model="selectedFilterKey">
            <option v-for="filter in chatFilters" :key="filter.key" :value="filter.key">
              {{ filter.title }}
            </option>
          </select>
        </div>
      </div>
      <p class="control">
        <button class="button is-light" @click="Runtime.openOptionPage()">
          <span class="icon">
            <i class="mdi mdi-cog" />
          </span>
          <span>設定</span>
        </button>
      </p>

      <template v-if="selectedVideo">
        <p class="control">
          <button class="button" title="動画ページを開く" :disabled="!selectedVideo.url" @click="handleOpenUrl(selectedVideo.url)">
            <span class="icon has-text-danger">
              <i class="mdi mdi-youtube" />
            </span>
          </button>
        </p>
        <p class="control">
          <button
            class="button"
            title="サムネイルを開く"
            :disabled="!selectedVideo.thumbnailUrl"
            @click="handleOpenUrl(selectedVideo.thumbnailUrl)"
          >
            <span class="icon has-text-success">
              <i class="mdi mdi-image" />
            </span>
          </button>
        </p>
        <p class="control">
          <button class="button is-danger is-light" :disabled="chats.length === 0" @click="handleDeleteChats(selectedVideo)">
            <span class="icon">
              <i class="mdi mdi-comment" />
            </span>
            <span>削除</span>
          </button>
        </p>
      </template>
    </div>

    <div class="field is-grouped">
      <p class="control">
        <button class="button" @click="selectedChats = [...filteredChats]">
          <span>すべて選択</span>
        </button>
      </p>
      <p class="control">
        <button class="button" @click="selectedChats = []">
          <span>選択解除</span>
        </button>
      </p>
      <p class="control">
        <button
          class="button is-success"
          :class="{ 'is-loading': isSaving }"
          :disabled="selectedChats.length === 0"
          @click="handleSaveToMerge"
        >
          <span class="icon">
            <i class="mdi mdi-content-save" />
          </span>
          <span>結合して保存</span>
        </button>
      </p>
      <p class="control">
        <button class="button is-danger" :disabled="selectedChats.length === 0" @click="handleDeleteSelectedChats">
          <span class="icon">
            <i class="mdi mdi-comment" />
          </span>
          <span>選択削除</span>
        </button>
      </p>
    </div>

    <div class="field">
      <span v-if="isOver" class="has-text-danger has-text-weight-bold">{{ MAX_CHAT_LENGTH }}件以上</span>
      <span v-else>{{ filteredChats.length }}件</span>

      <span>(全{{ chats.length }}件)</span>
      <span v-if="selectedChats.length">- {{ selectedChats.length }}件 選択中</span>
    </div>

    <div class="field">
      <ChatList v-if="filteredChats.length" v-model:selected="selectedChats" :chats="filteredChats" />
      <div v-else>チャットがありません。</div>
    </div>
  </section>
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

function scrollToTop(): void {
  window.scrollTo(0, 0)
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
  if (video.id && window.confirm(`「${video.title}」のチャットを全て削除します。`)) {
    await ChatStorage.clear(video.id)
    await reloadChats()
  }
}

async function handleDeleteSelectedChats(): Promise<void> {
  const videoId = selectedVideo.value?.id
  const selected = selectedChats.value
  if (videoId && selected.length > 0 && window.confirm(`選択されている ${selected.length}個 のチャットを削除します。`)) {
    await ChatStorage.remove(videoId, selected)
    await reloadChats()
  }
}

/** チャット画像を popup 上の要素から独自に生成する. */
async function generateOriginalImage(chat: Chat): Promise<string | undefined> {
  const node = document.querySelector<HTMLElement>(`.app-chat[data-chatid="${CSS.escape(chat.id ?? '')}"] .app-chat-main`)
  return node ? await NodeToPng.generate(node) : undefined
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

    if (urls.length === 0) throw new Error('画像があるチャットが選択されていません。')

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
  height: 800px;
  overflow-y: scroll;
}

/* 3行まで表示 */
.line-clamp-3 {
  -webkit-line-clamp: 3;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
