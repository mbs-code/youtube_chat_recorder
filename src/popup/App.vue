<template>
  <section class="section">
    <div class="field">
      <VideoDropdown :videos="videos" @change="handleChange" @close="handleClose"/>
    </div>

    <div class="field is-grouped">
      <template v-if="selected">
        <p class="control">
          <button
            class="button"
            data-tooltip="動画ページを開く"
            :disabled="!selected.url"
            :href="selected.url || ''"
            @click="handleOpenUrl(selected.url)"
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
            :disabled="!selected.thumbnailUrl"
            :href="selected.thumbnailUrl || ''"
            @click="handleOpenUrl(selected.thumbnailUrl)"
          >
            <span class="icon has-text-success">
              <i class="mdi mdi-image" />
            </span>
          </button>
        </p>
      </template>
    </div>

    <div class="field">
      <ChatList :chats="chats" />
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

  selected: Video | null = null
  chats: Chat[] = []

  async mounted(): Promise<void> {
    const videos = await VideoStorage.getAll()
    this.videos = videos
  }

  async handleChange(video?: Video): Promise<void> {
    this.selected = video || null

    // chat を読み込む
    if (this.selected) {
      const videoId = this.selected.id
      if (videoId) {
        const chats = await ChatStorage.get(videoId)
        this.chats = chats
      }
    } else {
      this.chats = []
    }
  }

  handleClose(): void {
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
