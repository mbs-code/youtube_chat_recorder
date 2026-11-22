<template>
  <div v-if="video" class="app-video" :data-videoid="video.id" @click="emit('click', video)">
    <div class="columns is-mobile">
      <div class="column is-narrow video-image">
        <img :src="video.thumbnailUrl" alt="thumbnail" />
      </div>
      <div class="column video-text">
        <p class="line-clamp-3 video-title">{{ title }}</p>
        <div>
          <span class="icon is-nonspace">
            <i class="mdi mdi-alarm" aria-hidden="true" />
          </span>
          <span>{{ datetimeString(video.startDate || video.publishedAt) }}</span>
        </div>
        <div>
          <span class="icon is-nonspace">
            <i class="mdi mdi-eye-outline" aria-hidden="true" />
          </span>
          <span>{{ distanceHumanized(video.updatedAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { datetimeString, distanceHumanized } from '../../lib/util/format'
import type Video from '../../models/Video'

const props = defineProps<{ video: Video | null }>()
const emit = defineEmits<{ click: [video: Video] }>()

const title = computed(() => {
  const title = props.video?.title || '-'
  return props.video?.isBroadcast ? '🔴' + title : title
})
</script>

<style scoped>
.video-image img {
  width: 200px;
}

.video-title {
  height: 72px; /* 高さ固定 */
  font-weight: 600;
}
</style>
