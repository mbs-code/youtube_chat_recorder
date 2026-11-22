<template>
  <div ref="root" class="relative">
    <!-- .trigger は scripts/screenshots.js から参照している -->
    <button
      class="trigger card flex w-full cursor-pointer items-center gap-2 p-2.5 transition-colors hover:border-zinc-300"
      :class="{ 'border-zinc-300': isOpen }"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      @click.stop="isOpen = !isOpen"
    >
      <VideoPanel v-if="selected" class="flex-1" :video="selected" />
      <span v-else class="flex h-18 flex-1 items-center gap-2 pl-1.5 text-zinc-500">
        <i class="mdi mdi-playlist-play" />
        {{ videos.length ? '動画を選択してください' : 'まだ動画がありません' }}
      </span>
      <i class="mdi mdi-chevron-down text-xl text-zinc-400 transition-transform" :class="{ 'rotate-180': isOpen }" />
    </button>

    <Transition
      enter-from-class="-translate-y-1 opacity-0"
      leave-to-class="-translate-y-1 opacity-0"
      enter-active-class="transition duration-100"
      leave-active-class="transition duration-100"
    >
      <ul v-if="isOpen" class="card absolute inset-x-0 top-[calc(100%+6px)] z-20 max-h-120 overflow-y-auto p-1.5 shadow-xl" role="listbox">
        <li
          v-for="video in videos"
          :key="video.id"
          class="cursor-pointer rounded-lg p-2 hover:bg-zinc-100"
          :class="{ 'bg-primary-soft shadow-[inset_3px_0_0_var(--color-primary)]': video.id === selected?.id }"
          role="option"
          :aria-selected="video.id === selected?.id"
          @click="handleSelected(video)"
        >
          <VideoPanel :video="video" />
        </li>
        <li v-if="videos.length === 0" class="p-4 text-center text-zinc-500">
          YouTube でライブ配信やアーカイブを開くと、ここに表示されます。
        </li>
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
