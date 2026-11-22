<template>
  <div class="box" @click="emit('click', chat)">
    <div class="columns is-mobile is-vcentered">
      <div class="column is-narrow">
        <!-- display only -->
        <input type="checkbox" :checked="isSelected" tabindex="-1" />
      </div>
      <div class="column app-chat" :data-chatid="chat.id">
        <div class="columns is-multiline">
          <div class="column is-12 app-chat-main">
            <div>
              {{ datetimeString(chat.timestamp) }}
              <span class="tag is-info is-light">{{ hmsString(chat.seconds) }}</span>
            </div>
            <div>{{ chat.authorName }}: {{ chat.altMessage }}</div>
            <div v-if="chat.money">{{ chat.moneyUnit }} {{ chat.money }}</div>
          </div>
          <div class="column is-12 app-chat-image">
            <div v-if="chat.pngUrl">
              <img :src="chat.pngUrl" alt="chat-image" />
            </div>
            <div v-if="chat.isImageError" class="has-text-grey-light">
              <span class="icon">
                <i class="mdi mdi-image-broken" />
              </span>
              <span>画像の取得に失敗しました</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { datetimeString, hmsString } from '../../lib/util/format'
import type Chat from '../../models/Chat'

defineProps<{ chat: Chat; isSelected: boolean }>()
const emit = defineEmits<{ click: [chat: Chat] }>()
</script>

<style scoped>
/* checkbox を x1.5 に */
input[type='checkbox'] {
  margin: 3px;
  transform: scale(1.5);
  pointer-events: none;
}

.box {
  box-shadow: none;
  cursor: pointer;
}

.app-chat-image {
  padding-top: 0;
}
</style>
