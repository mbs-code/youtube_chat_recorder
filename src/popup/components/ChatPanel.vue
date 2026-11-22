<template>
  <!-- .chat は scripts/screenshots.js から参照している -->
  <div
    class="chat card flex cursor-pointer gap-3 px-3 py-2.5 transition-[border-color,box-shadow] hover:border-zinc-300"
    :class="{ 'border-primary! ring-1 ring-primary': isSelected }"
    role="checkbox"
    :aria-checked="isSelected"
    tabindex="0"
    @click="emit('click', chat)"
    @keydown.space.prevent="emit('click', chat)"
  >
    <input
      type="checkbox"
      class="checkbox pointer-events-none mt-0.75"
      :checked="isSelected"
      tabindex="-1"
      aria-hidden="true"
    >

    <div class="app-chat min-w-0 flex-1" :data-chatid="chat.id">
      <!-- .app-chat-main は「独自のデザインで画像化」でそのまま画像になる (背景色が無いと透明になる) -->
      <div class="app-chat-main bg-white">
        <div class="mb-0.5 flex flex-wrap items-center gap-1">
          <span class="mr-1 text-xs text-zinc-500 tabular-nums">{{ datetimeString(chat.timestamp) }}</span>
          <span class="badge" title="配信開始からの時間">{{ hmsString(chat.seconds) }}</span>
          <span v-for="tag in tags" :key="tag.label" class="badge" :class="tag.class">{{ tag.label }}</span>
        </div>
        <p class="wrap-break-word">
          <span class="mr-2 font-semibold text-zinc-500">{{ chat.authorName }}</span>
          <span class="text-zinc-950">{{ chat.altMessage }}</span>
        </p>
      </div>

      <div v-if="chat.pngUrl" class="mt-2 overflow-hidden rounded-md border border-zinc-200">
        <img :src="chat.pngUrl" alt="チャットの画像">
      </div>
      <p v-else-if="chat.isImageError" class="mt-1.5 flex items-center gap-1 text-xs text-zinc-400">
        <i class="mdi mdi-image-broken-variant" />
        画像の取得に失敗しました
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * チャット 1 件の表示 (popup の一覧で使う).
 *
 * - 上段: 投稿日時・経過時間・種類のタグ、中段: 投稿者と本文、下段: 記録した画像.
 * - クリック (またはスペースキー) で click を emit する. 選択状態は親が持つ.
 */
import { computed } from 'vue'
import { datetimeString, hmsString } from '../../lib/util/format'
import type Chat from '../../models/Chat'

const props = defineProps<{
  chat: Chat
  /** 選択中なら枠を強調する. */
  isSelected: boolean
}>()
const emit = defineEmits<{ click: [chat: Chat] }>()

/** チャットの種類を表すタグ. */
const tags = computed(() => {
  const chat = props.chat
  const list: { label: string, class?: string }[] = []
  if (chat.isOwner) list.push({ label: '配信者', class: 'badge-warning' })
  if (chat.isModerator) list.push({ label: 'モデレーター', class: 'badge-info' })
  if (chat.isVerified) list.push({ label: '確認済み' })
  if (chat.money) list.push({ label: `${chat.moneyUnit ?? ''}${chat.money.toLocaleString()}`, class: 'badge-accent' })
  if (chat.topChatRank) list.push({ label: `👑 #${chat.topChatRank}`, class: 'badge-accent' })
  if (chat.replyTo) list.push({ label: `💬 ${chat.replyTo} へ返信`, class: 'badge-accent' })
  if (chat.isGift) list.push({ label: `🎁 ギフト${chat.giftCount ? ` ×${chat.giftCount}` : ''}`, class: 'badge-success' })
  if (chat.isMilestone) list.push({ label: `🎉 ${chat.milestoneText ?? 'メンバー歴'}`, class: 'badge-success' })
  else if (chat.isJoinMember) list.push({ label: 'メンバー加入', class: 'badge-success' })
  else if (chat.isMember) list.push({ label: 'メンバー', class: 'badge-success' })
  return list
})
</script>
