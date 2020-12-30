<template>
  <section class="section">
    <div class="field">
      <VideoDropdown :videos="videos" @change="handleVideoChange" @close="handleDropdownClose"/>
    </div>

    <div class="field is-grouped">
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
      </template>
    </div>

    <div class="field">
      <span>{{ chats.length }}件 (全{{ chats.length }}件)</span>
      <span v-if="selectedChats.length"> - {{ selectedChats.length }}件 選択中</span>
    </div>

    <div class="field">
      <ChatList v-if="chats.length" :chats="chats" @change="handleChatSelected" />
      <div v-else>チャットがありません。</div>
    </div>
  </section>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import VideoDropdown from './components/VideoDropdown.vue'
import ChatList from './components/ChatList.vue'

import BrowserTabs from '../lib/chrome/BrowserTabs'
import ChatStorage from '../lib/chrome/ChatStorage'
import VideoStorage from '../lib/chrome/VideoStorage'
import PageHelper from '../lib/util/PageHelper'
import Chat from '../models/Chat'
import Video from '../models/Video'

@Component({
  components: { VideoDropdown, ChatList }
})
export default class App extends Vue {
  videos: Video[] = []
  selectedVideo: Video | null = null

  chats: Chat[] = []
  selectedChats: Chat[] = []

  async mounted(): Promise<void> {
    const videos = await VideoStorage.getAll()
    this.videos = videos
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
