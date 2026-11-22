<template>
  <div ref="root" class="dropdown is-fullwidth" :class="{ 'is-active': isActive }">
    <div class="dropdown-trigger">
      <button class="button" aria-haspopup="true" @click.stop="isActive = !isActive">
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
        <VideoPanel
          v-for="video in videos"
          :key="video.id"
          :video="video"
          class="dropdown-item"
          :class="{ 'is-active': video.id === selected?.id }"
          @click="handleSelected(video)"
        />
        <div v-if="videos.length === 0" class="box">動画がありません。</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue'
import BrowserTabs from '../../lib/chrome/BrowserTabs'
import PageHelper from '../../lib/util/PageHelper'
import type Video from '../../models/Video'
import VideoPanel from './VideoPanel.vue'

const props = defineProps<{ videos: Video[] }>()
const emit = defineEmits<{ change: [video: Video | null]; close: [] }>()

const isActive = ref(false)
const selected = shallowRef<Video | null>(null)
const root = useTemplateRef<HTMLElement>('root')

// 動画一覧が変わったら、開いているタブの動画を初期選択にする
watch(
  () => props.videos,
  async videos => {
    selected.value = null
    const activeTab = await BrowserTabs.getActiveTab()
    const videoId = PageHelper.getPageVideoId(activeTab?.url)
    const find = videoId ? videos.find(v => v.id === videoId) : undefined
    if (find) {
      selected.value = find
      emit('change', find)
    }
  }
)

function handleClose(): void {
  if (isActive.value) {
    isActive.value = false
    emit('close')
  }
}

function handleSelected(video: Video): void {
  selected.value = video
  emit('change', video)
  handleClose()
}

// ドロップダウンの外側をクリックしたら閉じる
function onClickOutside(event: MouseEvent): void {
  if (root.value && !root.value.contains(event.target as Node)) handleClose()
}
onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
</script>

<style scoped>
/* is-fullwidth に対応させる */
.dropdown.is-fullwidth {
  display: flex;
}

.dropdown-trigger {
  width: 560px;
}

.dropdown-menu,
.dropdown-trigger > button,
.dropdown-trigger > button > span:first-child {
  width: 100%;
}

/* ボタン内部に block 要素を入れる */
.dropdown-trigger > button {
  height: auto !important;
  text-align: unset;
  white-space: unset;
  justify-content: space-between;
}

/* dropdown 全体のフチ */
.dropdown-content {
  padding: 0;
  border: solid 1px gray;
}

/* dropdown の要素 */
.dropdown-item {
  font-size: 1rem;
  cursor: pointer;

  &.is-active {
    background: aliceblue;
    color: inherit;
  }

  &:hover {
    background: gainsboro !important;
  }

  &:not(:last-child) {
    border-bottom: solid 1px lightgray;
  }
}
</style>
