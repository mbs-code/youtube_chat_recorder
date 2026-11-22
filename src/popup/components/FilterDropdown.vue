<template>
  <div ref="root" class="relative">
    <!-- 選んでいる絞り込み (クリックで一覧を開く) -->
    <button
      class="select flex h-7 w-52 cursor-pointer items-center gap-1.5 text-left text-xs"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      aria-label="表示するチャット"
      @click.stop="isOpen = !isOpen"
    >
      <span class="min-w-0 flex-1 truncate">{{ selected?.title }}</span>
      <span class="badge">{{ selected?.count ?? 0 }}</span>
    </button>

    <!-- 絞り込みの一覧 (それぞれの件数付き. 0 件のものは薄くする) -->
    <ul
      v-if="isOpen"
      class="card absolute top-[calc(100%+4px)] left-0 z-20 max-h-[50vh] w-60 overflow-y-auto p-1 text-xs shadow-xl"
      role="listbox"
    >
      <li
        v-for="option in options"
        :key="option.key"
        class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-100"
        :class="{ 'bg-primary-soft': option.key === modelValue, 'text-zinc-400': option.count === 0 }"
        role="option"
        :aria-selected="option.key === modelValue"
        @click="handleSelected(option.key)"
      >
        <span class="min-w-0 flex-1 truncate">{{ option.title }}</span>
        <span class="badge">{{ option.count }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
/**
 * チャットの絞り込みの選択欄. (それぞれに当てはまる件数をバッジで出すため、select ではなく自前のドロップダウン)
 *
 * - 外側のクリックや Esc で閉じる.
 */
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'

export interface FilterOption {
  key: string
  title: string
  count: number
}

const props = defineProps<{
  options: FilterOption[]
}>()
const modelValue = defineModel<string>({ required: true })

const isOpen = ref(false)
const root = useTemplateRef<HTMLElement>('root')
const selected = computed(() => props.options.find(o => o.key === modelValue.value))

function handleSelected(key: string): void {
  modelValue.value = key
  isOpen.value = false
}

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
