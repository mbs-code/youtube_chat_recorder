<template>
  <section class="section">
    <div class="field">
      <VideoDropdown :videos="videos" @change="handleVideoChange" @close="handleDropdownClose"/>
    </div>

    <div class="field is-grouped">
      <div class="control">
        <div class="select">
          <select v-model="selectedFilter">
            <option
              v-for="filter in chatFilters"
              :key="filter.key"
              :value="filter.key"
            >
              {{ filter.title }}
            </option>
          </select>
        </div>
      </div>
      <p class="control">
        <button
          class="button is-light"
          @click="handleOpenOptionPage"
        >
          <span class="icon">
            <i class="mdi mdi-cog" />
          </span>
          <span>設定</span>
        </button>
      </p>

      <template v-if="selectedVideo">
        <p class="control">
          <button
            class="button"
            data-tooltip="動画ページを開く"
            :disabled="!selectedVideo.url"
            :href="selectedVideo.url || ''"
            @click="handleOpenUrl(selectedVideo.url)"
          >
            <span class="icon has-text-danger">
              <i class="mdi mdi-youtube" />
            </span>
          </button>
        </p>
        <p class="control">
          <button
            class="button"
            data-tooltip="サムネイルを開く"
            :disabled="!selectedVideo.thumbnailUrl"
            :href="selectedVideo.thumbnailUrl || ''"
            @click="handleOpenUrl(selectedVideo.thumbnailUrl)"
          >
            <span class="icon has-text-success">
              <i class="mdi mdi-image" />
            </span>
          </button>
        </p>
        <!-- <p class="control">
          <button
            class="button"
            data-tooltip="jsonで出力する"
            :disabled="!selectedVideo.thumbnailUrl || !chats.length"
            :href="selectedVideo.thumbnailUrl || ''"
            @click="handleExportJson()"
          >
            <span class="icon has-text-black">
              <i class="mdi mdi-code-json" />
            </span>
          </button>
        </p> -->
        <p class="control">
          <button
            class="button is-danger is-light"
            :disabled="!selectedVideo.thumbnailUrl"
            :href="selectedVideo.thumbnailUrl || ''"
            @click="handleDeleteChats(selectedVideo)"
          >
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
        <button
          class="button"
          @click="handleSelectAll"
        >
          <span>すべて選択</span>
        </button>
      </p>
      <p class="control">
        <button
          class="button"
          @click="handleUnselectAll"
        >
          <span>選択解除</span>
        </button>
      </p>
      <p class="control">
        <button
          class="button is-success"
          :disabled="selectedChats.length === 0"
          @click="handlerSaveToMerge"
        >
          <span class="icon">
            <i class="mdi mdi-content-save" />
          </span>
          <span>結合して保存</span>
        </button>
      </p>
      <p class="control">
        <button
          class="button is-danger"
          :disabled="selectedChats.length === 0"
          @click="handleDeleteSelectedChats"
        >
          <span class="icon">
            <i class="mdi mdi-comment" />
          </span>
          <span>選択削除</span>
        </button>
      </p>
    </div>

    <div class="field">
      <span v-if="isOver" class="has-text-danger has-text-weight-bold">{{ maxChatLength }}件以上</span>
      <span v-else>{{ filteredChats.length }}件</span>

      <span>(全{{ chats.length }}件)</span>
      <span v-if="selectedChats.length"> - {{ selectedChats.length }}件 選択中</span>
    </div>

    <div class="field">
      <ChatList
        v-if="filteredChats.length"
        ref="chatList"
        :chats="filteredChats"
        :filter="selectedFilter"
        @change="handleChatSelected"
      />
      <div v-else>チャットがありません。</div>
    </div>
  </section>
</template>

<script lang="ts">
import { format as dateFormat } from 'date-fns'
import arraySort from 'array-sort'
import { Component, Vue } from 'vue-property-decorator'
import VideoDropdown from './components/VideoDropdown.vue'
import ChatList from './components/ChatList.vue'

import BrowserTabs from '../lib/chrome/BrowserTabs'
import ChatStorage from '../lib/chrome/storage/ChatStorage'
import VideoStorage from '../lib/chrome/storage/VideoStorage'
import Filer from '../lib/chrome/Filer'
import Runtime from '../lib/chrome/Runtime'
import PageHelper from '../lib/util/PageHelper'
import Chat from '../models/Chat'
import Video from '../models/Video'
import NodeToPng from '../lib/util/NodeToPng'

import ConfigStorage from '../lib/chrome/storage/ConfigStorage'
import ChatFilter from '../lib/chatFilter/ChatFilter'
import { ChatFilterDataInterface } from '../lib/chatFilter/ChatFilterInterface'
import { classToPlain, serialize } from 'class-transformer'

@Component({
  components: { VideoDropdown, ChatList }
})
export default class App extends Vue {
  videos: Video[] = []
  selectedVideo: Video | null = null

  chats: Chat[] = []
  selectedChats: Chat[] = []

  chatFilters: ChatFilterDataInterface[] = []
  selectedFilter: string| null = null

  maxChatLength: number = 100 // 最大表示チャット数
  isOver: boolean = false // 最大長を超えたか

  $refs!: {
    chatList: ChatList,
  }

  get filteredChats() {
    // 表示用 cahts (時間順にソート)
    const chatFilter = this.chatFilters.find(c => c.key === this.selectedFilter)

    // フィルタリング
    const filtered = chatFilter
      ? this.chats.filter(c => (chatFilter.func ? chatFilter.func(c) : false))
      : this.chats

    // ソート
    const sorted = arraySort(filtered, 'seconds')

    // リミット
    this.isOver = (sorted.length > this.maxChatLength)
    const limited = sorted.slice(0, this.maxChatLength)

    return limited
  }

  async mounted(): Promise<void> {
    // badge を 0 にする
    const activeTab = await BrowserTabs.getActiveTab()
    if (activeTab) {
      // 非同期で実行 (失敗してもOK)
      Runtime.sendBadgeText('', activeTab)
        .catch(err => { /**/ })
    }

    // 値の読み込み
    await this.loadData()
  }

  async loadData(): Promise<void> {
    // 値読み込み
    const videos = await VideoStorage.getAll()
    this.videos = videos

    this.chatFilters = ChatFilter.generatePopupChatFilters()
    this.selectedFilter = this.chatFilters[0].key
  }

  async handleVideoChange(video?: Video): Promise<void> {
    this.selectedVideo = video || null
    this.chats = []
    this.selectedChats = []

    // chat を読み込む
    if (this.selectedVideo) {
      const videoId = this.selectedVideo.id
      if (videoId) {
        const chats = await ChatStorage.get(videoId)
        this.chats = chats
        if (this.$refs.chatList) {
          this.$refs.chatList.unselectedAll()
        }
      }
    } else {
      this.chats = []
    }
  }

  handleChatSelected(chats: Chat[]): void {
    this.selectedChats = chats
  }

  handleDropdownClose(): void {
    window.scrollTo(0, 0)
  }

  ///

  async handleOpenOptionPage(): Promise<void> {
    await Runtime.openOptionPage()
  }

  async handleOpenUrl(url?: string): Promise<void> {
    if (url) {
      // 現在表示されていないページならタブを作成する
      const activeTab = await BrowserTabs.getActiveTab()
      const videoId = await PageHelper.getPageVideoId(activeTab?.url)

      if (url !== activeTab?.url) {
        await BrowserTabs.windowOpen(url, activeTab)
      }
    }
  }

  // async handleExportJson(): Promise<void> {
  //   if (this.chats.length) {
  //     // json 化して出力する
  //     const plains = this.chats.map(c => classToPlain(c))
  //     const text = serialize(plains)
  //     const blob = new Blob([text], { type: 'octet/stream' })
  //     const title = dateFormat(new Date(), 'yyyyMMdd_HHmmss') + '_yt_' + this.selectedVideo?.id + '.json'

  //     await Filer.downloadFile(window.URL.createObjectURL(blob), title)
  //   }
  // }

  async handleDeleteChats(video?: Video): Promise<void> {
    // TODO: 動画を削除しちゃうと色々と不都合なので、とりあえず全チャットを削除
    if (video) {
      const result = window.confirm(`「${video.title}」のチャットを全て削除します。`)
      if (result && video?.id) {
        await ChatStorage.clear(video.id)
        this.selectedChats = []
        this.chats = await ChatStorage.get(video.id)
      }
    }
  }

  ///

  handleSelectAll(): void {
    this.$refs.chatList.selectedAll()
  }

  handleUnselectAll(): void {
    this.$refs.chatList.unselectedAll()
  }

  async handlerSaveToMerge(): Promise<void> {
    const video = this.selectedVideo
    const selected = this.selectedChats

    // 設定を読み込む
    const config = await ConfigStorage.get()

    if (video && selected.length > 0) {
      try {
        // url を取得していく
        const urls = []
        for (const chat of selected) {
          if (config.generateOriginalImage) {
            // 全てを独自で描画するモード
              const node = document.querySelector(`.app-chat[data-chatid="${chat.id}"] .app-chat-main`)
              if (node) {
                const url = await NodeToPng.generage(node as HTMLElement)
                urls.push(url)
              }
          } else if (chat.pngUrl) {
            // url があるならそれ
            urls.push(chat.pngUrl)
          } else {
            if (config.complementImage) {
              // 無いなら生成するモード
              const node = document.querySelector(`.app-chat[data-chatid="${chat.id}"] .app-chat-main`)
              if (node) {
                const url = await NodeToPng.generage(node as HTMLElement)
                urls.push(url)
              }
            }
          }
        }

        if (urls.length === 0) throw new Error('No image urls')

        // ファイル名を生成して保存する
        const filename = config.formatFilename(video, selected)
        const mergeUrl = await NodeToPng.merge(urls)
        Filer.downloadImage(mergeUrl, filename)
      } catch(err) {
        window.alert(err)
      }
    }
  }

  async handleDeleteSelectedChats(): Promise<void> {
    const videoId = this.selectedVideo?.id
    const selected = this.selectedChats

    if (selected.length > 0) {
      const result = window.confirm(`選択されている ${selected.length}個 のチャットを削除します。`)
      if (result && videoId) {
        await ChatStorage.remove(videoId, selected)
        this.selectedChats = []
        this.chats = await ChatStorage.get(videoId)
      }
    }
  }
}
</script>

<style lang="scss">
html {
  width: 600px;
  height: 800px;
  overflow-y: scroll;
}

// 3行まで表示
.line-clamp-3 {
  -webkit-line-clamp: 3;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
