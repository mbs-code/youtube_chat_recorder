<template>
  <div v-on-clickaway="handleClose" class="dropdown is-fullwidth" :class="{'is-active': isActive }">
    <div class="dropdown-trigger">
      <button
        class="button"
        aria-haspopup="true"
        @click.stop="handleOpen"
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
          <VideoPanel :key="video.id" :video="video" class="dropdown-item" @click="handleSelected(video)" />
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import { directive as onClickaway } from 'vue-clickaway'
import VideoPanel from '../components/VideoPanel.vue'
import Video from '../models/Video'

@Component({
  components: { VideoPanel },
  directives: { onClickaway },
})
export default class App extends Vue {
  isActive = true
  selected: Video | null = null

  @Prop({ default: [] })
  videos!: Video[]

  handleOpen(): void {
    this.isActive = true
  }

  handleClose(): void {
    this.isActive = false
    this.$emit('close')
  }

  handleSelected(video: Video): void {
    this.selected = video
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

  &:hover {
    background: gainsboro;
    // color: white;
  }

  &:not(:last-child) {
    border-bottom: solid  1px lightgray;
  }
}
</style>
