<template>
  <div class="flex min-w-0 gap-3 text-left">
    <div class="grid aspect-video w-32 shrink-0 place-items-center overflow-hidden rounded-lg bg-zinc-100 text-[28px] text-zinc-400">
      <img v-if="video.thumbnailUrl" class="size-full object-cover" :src="video.thumbnailUrl" alt="">
      <i v-else class="mdi mdi-youtube" />
    </div>
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <p class="line-clamp-2 leading-snug font-semibold text-zinc-950">{{ video.title || '(タイトルなし)' }}</p>
      <div class="flex min-w-0 items-center gap-x-2.5 text-xs">
        <span v-if="TYPE_LABELS[video.type]" class="badge" :class="{ 'badge-accent': video.type === 'live' }">
          {{ TYPE_LABELS[video.type] }}
        </span>
        <span v-if="video.channelName" class="truncate text-zinc-500">{{ video.channelName }}</span>
      </div>
      <div class="flex items-center gap-x-2.5 text-xs text-zinc-500">
        <span>
          <i class="mdi mdi-calendar-blank-outline mr-0.5" />
          {{ datetimeString(video.startDate || video.publishedAt) }}
        </span>
        <span>
          <i class="mdi mdi-eye-outline mr-0.5" />
          {{ distanceHumanized(video.updatedAt) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { datetimeString, distanceHumanized } from '../../lib/util/format'
import type Video from '../../models/Video'
import type { VideoType } from '../../models/Video'

defineProps<{ video: Video }>()

const TYPE_LABELS: Record<VideoType, string> = {
  live: '● ライブ',
  upcoming: '配信予定',
  archive: 'アーカイブ',
  video: '',
}
</script>
