<template>
  <div v-if="video" @click="handleClick">
    <div class="columns is-mobile">
      <div class="column is-narrow video-image">
        <img :src="video.thumbnailUrl" alt="thumbnail">
      </div>
      <div class="column video-text">
        <p class='line-clamp-3 video-title'>{{ computedTitle }}</p>
        <div>
          <span class="icon is-nonspace">
            <i class="mdi mdi-alarm" aria-hidden="true" />
          </span>
          <span>{{ (video.startDate || video.publishedAt) | datetimeString }}</span>
        </div>
        <div>
          <span class="icon is-nonspace">
            <i class="mdi mdi-eye-outline" aria-hidden="true" />
          </span>
          <span>{{ video.updatedAt | distanceHumanized }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import displayFilter from '../../filters/displayFilter'
import Video from '../../models/Video'

@Component({
  filters: displayFilter,
})
export default class VideoPanel extends Vue {
  @Prop({ default: null })
  video!: Video | null

  get computedTitle(): string {
    const type = this.video?.type
    const title = this.video?.title || '-'

    switch (type) {
      case 'live': return '🔴' + title
      default: return title
    }
  }

  handleClick(): void {
    this.$emit('click', this.video)
  }
}
</script>

<style lang="scss" scoped>
.video-image img {
  width: 200px;
}

.video-title {
  height: 72px; // 高さ固定
  font-weight: 600;
}
</style>
