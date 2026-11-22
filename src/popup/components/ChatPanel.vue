<template>
  <div
    class="chat card"
    :class="{ 'is-selected': isSelected }"
    role="checkbox"
    :aria-checked="isSelected"
    tabindex="0"
    @click="emit('click', chat)"
    @keydown.space.prevent="emit('click', chat)"
  >
    <input type="checkbox" class="checkbox" :checked="isSelected" tabindex="-1" aria-hidden="true" />

    <div class="app-chat" :data-chatid="chat.id">
      <!-- .app-chat-main は「独自のデザインで画像化」でそのまま画像になる -->
      <div class="app-chat-main">
        <div class="head">
          <span class="time">{{ datetimeString(chat.timestamp) }}</span>
          <span class="badge" title="配信開始からの時間">{{ hmsString(chat.seconds) }}</span>
          <span v-for="tag in tags" :key="tag.label" class="badge" :class="tag.class">{{ tag.label }}</span>
        </div>
        <p class="text">
          <span class="author">{{ chat.authorName }}</span>
          <span class="message">{{ chat.altMessage }}</span>
        </p>
      </div>

      <div v-if="chat.pngUrl" class="image">
        <img :src="chat.pngUrl" alt="チャットの画像" />
      </div>
      <p v-else-if="chat.isImageError" class="image-error">
        <i class="mdi mdi-image-broken-variant" />
        画像の取得に失敗しました
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { datetimeString, hmsString } from '../../lib/util/format'
import type Chat from '../../models/Chat'

const props = defineProps<{ chat: Chat; isSelected: boolean }>()
const emit = defineEmits<{ click: [chat: Chat] }>()

/** チャットの種類を表すタグ. */
const tags = computed(() => {
  const chat = props.chat
  const list: { label: string; class?: string }[] = []
  if (chat.isOwner) list.push({ label: '配信者', class: 'is-warning' })
  if (chat.isModerator) list.push({ label: 'モデレーター', class: 'is-info' })
  if (chat.isVerified) list.push({ label: '確認済み' })
  if (chat.money) list.push({ label: `${chat.moneyUnit ?? ''}${chat.money.toLocaleString()}`, class: 'is-accent' })
  if (chat.topChatRank) list.push({ label: `👑 #${chat.topChatRank}`, class: 'is-accent' })
  if (chat.isMilestone) list.push({ label: `🎉 ${chat.milestoneText ?? 'メンバー歴'}`, class: 'is-success' })
  else if (chat.isJoinMember) list.push({ label: 'メンバー加入', class: 'is-success' })
  else if (chat.isMember) list.push({ label: 'メンバー', class: 'is-success' })
  return list
})
</script>

<style scoped>
.chat {
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  cursor: pointer;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;

  &:hover {
    border-color: var(--border-strong);
  }

  &.is-selected {
    border-color: var(--primary);
    box-shadow: 0 0 0 1px var(--primary);
  }

  & > .checkbox {
    margin-top: 3px;
    pointer-events: none;
  }
}

.app-chat {
  flex: 1;
  min-width: 0;
}

.app-chat-main {
  background: var(--surface); /* 画像化した時に透明にならないように */
}

.head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-bottom: 2px;
}

.time {
  margin-right: 4px;
  color: var(--text-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.text {
  word-break: break-word;
}

.author {
  margin-right: 8px;
  color: var(--text-muted);
  font-weight: 600;
}

.message {
  color: var(--text-strong);
}

.image {
  margin-top: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 6px;

  & img {
    max-width: 100%;
  }
}

.image-error {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  color: var(--text-subtle);
  font-size: 12px;
}
</style>
