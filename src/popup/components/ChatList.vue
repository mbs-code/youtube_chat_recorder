<template>
  <div>
    <ChatPanel
      v-for="chat in chats"
      :key="chat.id"
      :chat="chat"
      :is-selected="selectedIds.has(chat.id)"
      class="list-item"
      :class="{ 'is-active': selectedIds.has(chat.id) }"
      @click="toggle(chat)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type Chat from '../../models/Chat'
import ChatPanel from './ChatPanel.vue'

defineProps<{ chats: Chat[] }>()

/** 選択中のチャット (親と双方向バインド). */
const selected = defineModel<Chat[]>('selected', { required: true })

const selectedIds = computed(() => new Set(selected.value.map(c => c.id)))

function toggle(chat: Chat): void {
  selected.value = selectedIds.value.has(chat.id) ? selected.value.filter(c => c.id !== chat.id) : [...selected.value, chat]
}
</script>

<style scoped>
.list-item {
  border: solid 1px gainsboro;

  &.is-active {
    background: aliceblue;
    border: solid 1px dodgerblue;
  }

  &:hover {
    background: gainsboro !important;
  }
}
</style>
