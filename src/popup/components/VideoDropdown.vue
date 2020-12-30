<template>
  <div v-on-clickaway="handleClose" class="dropdown is-fullwidth" :class="{'is-active': isActive }">
    <div class="dropdown-trigger">
      <button
        class="button"
        aria-haspopup="true"
        @click.stop="handleToggle"
      >
        <span v-if="selected">
          <VideoPanel :key="selected.id" :video="selected" />
        </span>
        <span v-else>--- 動画を選択してください ---</span>
        <span class="icon is-small">
          <i class="mdi mdi-chevron-down" aria-hidden="true" />
        </span>
      </button>
    </div>
    <div class="dropdown-menu" role="menu">
      <div class="dropdown-content">
        <template v-for="video in videos">
          <VideoPanel
            :key="video.id"
            :video="video"
            class="dropdown-item"
            :class="{ 'is-active': isSelectedVideo(video) }"
            @click="handleSelected(video)"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator'
import { directive as onClickaway } from 'vue-clickaway'
import VideoPanel from './VideoPanel.vue'

import Video from '../../models/Video'
import BrowserTabs from '../../lib/chrome/BrowserTabs'
import PageHelper from '../../lib/util/PageHelper'

@Component({
  components: { VideoPanel },
  directives: { onClickaway },
})
export default class VideoDropdown extends Vue {
  isActive = false
  selected: Video | null = null

  @Prop({ default: [] })
  videos!: Video[]

  @Watch('videos')
  async onVideosChanged(): Promise<void> {
    // select の初期化
    this.selected = null

    // 初期に選択される動画を探す
    const activeTab = await BrowserTabs.getActiveTab()
    const videoId = await PageHelper.getPageVideoId(activeTab?.url)
    if (videoId) {
      const find = this.videos.find(v => v?.id && (v?.id === videoId))
      if (find) {
        this.selected = find
        this.$emit('change', this.selected)
      }
    }
  }

  isSelectedVideo(video: Video): boolean {
    return video && (video?.id === this.selected?.id)
  }

  handleToggle(): void {
    this.isActive = !this.isActive
  }

  handleClose(): void {
    if (this.isActive) {
      this.isActive = false
      this.$emit('close')
    }
  }

  handleSelected(video: Video): void {
    this.selected = video
    this.$emit('change', this.selected)
    this.handleClose()
  }
}
</script>

<style lang="scss" scoped>
// is-fullwidth に対応させる
.dropdown.is-fullwidth {
  display: flex;
  & * {
    width: 100%;
  }
}

.dropdown-trigger {
  width: 560px;
  // width: 300px;
}

// ボタン内部に block 要素を入れる
.dropdown-trigger > button {
  height: auto !important;
  text-align: unset;
  white-space: unset;
}

// dropdown 全体のフチ
.dropdown-content {
  padding: 0;
  border: solid 1px gray;
  // border-radius: 0;
}

// dropdown の要素について
.dropdown-item {
  font-size: 1rem;

  &.is-active {
    background: aliceblue;
  }

  &:hover {
    background: gainsboro !important;
    // color: white;
  }

  &:not(:last-child) {
    border-bottom: solid  1px lightgray;
  }
}
</style>
