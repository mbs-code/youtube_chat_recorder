<template>
  <section class="section">
    <div class="field">
      <VideoDropdown :videos="videos" @close="handleClose" />
    </div>
  </section>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import VideoDropdown from '../components/VideoDropdown.vue'

import VideoStorage from '../lib/chrome/VideoStorage'
import Video from '../models/Video'

@Component({
  components: { VideoDropdown }
})
export default class App extends Vue {
  message = 'Hello world with TypeScript!'
  videos: Video[] = []

  async mounted(): Promise<void> {
    const videos = await VideoStorage.getAll()
    this.videos = videos
  }

  handleClose(): void {
    window.scrollTo(0, 0)
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
