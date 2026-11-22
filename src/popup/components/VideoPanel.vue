<template>
  <div class="video">
    <div class="thumbnail">
      <img v-if="video.thumbnailUrl" :src="video.thumbnailUrl" alt="" />
      <i v-else class="mdi mdi-youtube" />
    </div>
    <div class="body">
      <p class="title">{{ video.title || '(タイトルなし)' }}</p>
      <div class="meta">
        <span v-if="TYPE_LABELS[video.type]" class="badge" :class="video.type === 'live' ? 'is-accent' : ''">
          {{ TYPE_LABELS[video.type] }}
        </span>
        <span v-if="video.channelName" class="channel">{{ video.channelName }}</span>
      </div>
      <div class="meta muted">
        <span>
          <i class="mdi mdi-calendar-blank-outline" />
          {{ datetimeString(video.startDate || video.publishedAt) }}
        </span>
        <span>
          <i class="mdi mdi-eye-outline" />
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

<style scoped>
.video {
  display: flex;
  gap: 12px;
  min-width: 0;
  text-align: left;
}

.thumbnail {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 128px;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 8px;
  background: var(--hover);
  color: var(--text-subtle);
  font-size: 28px;

  & img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.title {
  display: -webkit-box;
  overflow: hidden;
  color: var(--text-strong);
  font-weight: 600;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.meta {
  display: flex;
  align-items: center;
  gap: 4px 10px;
  min-width: 0;
  font-size: 12px;

  & .mdi {
    margin-right: 2px;
  }
}

.channel {
  overflow: hidden;
  color: var(--text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
