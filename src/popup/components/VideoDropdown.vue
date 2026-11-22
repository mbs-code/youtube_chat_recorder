<template>
  <div ref="root" class="dropdown">
    <button
      class="trigger card"
      :class="{ 'is-open': isOpen }"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      @click.stop="isOpen = !isOpen"
    >
      <VideoPanel v-if="selected" :video="selected" />
      <span v-else class="placeholder">
        <i class="mdi mdi-playlist-play" />
        {{ videos.length ? '動画を選択してください' : 'まだ動画がありません' }}
      </span>
      <i class="mdi mdi-chevron-down chevron" />
    </button>

    <Transition name="menu">
      <ul v-if="isOpen" class="menu card" role="listbox">
        <li
          v-for="video in videos"
          :key="video.id"
          class="item"
          :class="{ 'is-selected': video.id === selected?.id }"
          role="option"
          :aria-selected="video.id === selected?.id"
          @click="handleSelected(video)"
        >
          <VideoPanel :video="video" />
        </li>
        <li v-if="videos.length === 0" class="empty muted">YouTube でライブ配信やアーカイブを開くと、ここに表示されます。</li>
      </ul>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue'
import BrowserTabs from '../../lib/chrome/BrowserTabs'
import PageHelper from '../../lib/util/PageHelper'
import type Video from '../../models/Video'
import VideoPanel from './VideoPanel.vue'

const props = defineProps<{ videos: Video[] }>()
const emit = defineEmits<{ change: [video: Video | null] }>()

const isOpen = ref(false)
const selected = shallowRef<Video | null>(null)
const root = useTemplateRef<HTMLElement>('root')

// 動画一覧が変わったら、開いているタブの動画 (無ければ最近見た動画) を初期選択にする
watch(
  () => props.videos,
  async videos => {
    const activeTab = await BrowserTabs.getActiveTab()
    const videoId = PageHelper.getPageVideoId(activeTab?.url)
    const find = (videoId ? videos.find(v => v.id === videoId) : undefined) ?? videos[0] ?? null
    selected.value = find
    emit('change', find)
  }
)

function handleSelected(video: Video): void {
  selected.value = video
  emit('change', video)
  isOpen.value = false
}

// ドロップダウンの外側をクリック / Esc で閉じる
function onClickOutside(event: MouseEvent): void {
  if (root.value && !root.value.contains(event.target as Node)) isOpen.value = false
}
function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') isOpen.value = false
}
onMounted(() => {
  document.addEventListener('click', onClickOutside)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.dropdown {
  position: relative;
}

.trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px;
  font: inherit;
  cursor: pointer;
  transition: border-color 0.15s;

  &:hover,
  &.is-open {
    border-color: var(--border-strong);
  }

  & > .video {
    flex: 1;
  }
}

.placeholder {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  height: 72px;
  padding-left: 6px;
  color: var(--text-muted);
}

.chevron {
  color: var(--text-subtle);
  font-size: 20px;
  transition: transform 0.15s;

  .is-open & {
    transform: rotate(180deg);
  }
}

.menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  left: 0;
  z-index: 20;
  max-height: 480px;
  margin: 0;
  padding: 6px;
  overflow-y: auto;
  box-shadow: 0 12px 32px rgb(0 0 0 / 0.12);
  list-style: none;
}

.item {
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;

  &:hover {
    background: var(--hover);
  }

  &.is-selected {
    background: var(--primary-soft);
    box-shadow: inset 3px 0 0 var(--primary);
  }
}

.empty {
  padding: 16px;
  text-align: center;
}

.menu-enter-active,
.menu-leave-active {
  transition:
    opacity 0.12s,
    transform 0.12s;
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
