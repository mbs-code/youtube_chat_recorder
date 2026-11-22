<template>
  <div class="flex flex-col gap-2">
    <ChatPanel
      v-for="chat in chats"
      :key="chat.id"
      :chat="chat"
      :is-selected="selectedIds.has(chat.id)"
      @click="toggle(chat)"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * チャットの一覧. クリックで選択 / 選択解除する.
 *
 * - 選択中のチャットは v-model:selected で親と共有する (選択した順に並ぶ).
 */
import { computed } from 'vue'
import type Chat from '../../models/Chat'
import ChatPanel from './ChatPanel.vue'

defineProps<{
  /** 表示するチャット (並び替え・絞り込み済み). */
  chats: Chat[]
}>()

/** 選択中のチャット (親と双方向バインド, 選択した順). */
const selected = defineModel<Chat[]>('selected', { required: true })

/** 選択中かどうかを素早く調べるための ID の集合. */
const selectedIds = computed(() => new Set(selected.value.map(c => c.id)))

/** 選択 / 選択解除を切り替える (選択した順を保つ). */
function toggle(chat: Chat): void {
  selected.value = selectedIds.value.has(chat.id) ? selected.value.filter(c => c.id !== chat.id) : [...selected.value, chat]
}
</script>
