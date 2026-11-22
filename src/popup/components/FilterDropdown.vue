<template>
  <div ref="root" class="relative">
    <!-- 選んでいる絞り込み (クリックで一覧を開く) -->
    <button
      class="select flex h-7 w-52 cursor-pointer items-center gap-1.5 text-left text-xs"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      aria-label="表示するチャット"
      :title="allTitles"
      @click.stop="isOpen = !isOpen"
    >
      <span class="min-w-0 flex-1 truncate">{{ label }}</span>
      <span class="badge">{{ count }}</span>
    </button>

    <!-- 絞り込みの一覧 (複数選べる. それぞれの件数付き. 0 件のものは薄くする) -->
    <ul
      v-if="isOpen"
      class="card absolute top-[calc(100%+4px)] left-0 z-20 max-h-[50vh] w-60 overflow-y-auto p-1 text-xs shadow-xl"
      role="listbox"
      aria-multiselectable="true"
    >
      <li
        v-for="option in options"
        :key="option.key"
        class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-100"
        :class="{ 'bg-primary-soft': isSelected(option.key), 'text-zinc-400': option.count === 0 }"
        role="option"
        :aria-selected="isSelected(option.key)"
        @click="handleToggle(option)"
      >
        <i
          class="mdi text-sm"
          :class="isSelected(option.key) ? 'mdi-checkbox-marked text-primary' : 'mdi-checkbox-blank-outline text-zinc-400'"
        />
        <span class="min-w-0 flex-1 truncate">{{ option.title }}</span>
        <span class="badge">{{ option.count }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
/**
 * チャットの絞り込みの選択欄. (複数選べて、それぞれに当てはまる件数をバッジで出すため、select ではなく自前のドロップダウン)
 *
 * - exclusive な選択肢 (すべて表示) を選ぶと他は外れ、他を選ぶと exclusive なものは外れる.
 * - 全部外したら exclusive な選択肢に戻る.
 * - 選んでいる間は閉じない. 外側のクリックや Esc で閉じる.
 */
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'

export interface FilterOption {
  key: string
  title: string
  count: number
  exclusive?: boolean
}

const props = defineProps<{
  options: FilterOption[]
  /** 選んでいる絞り込みで表示される件数. */
  count: number
}>()
const modelValue = defineModel<string[]>({ required: true })

const isOpen = ref(false)
const root = useTemplateRef<HTMLElement>('root')

const label = computed(() => {
  const titles = props.options.filter(o => modelValue.value.includes(o.key)).map(o => o.title)
  if (titles.length > 1) return `${titles[0]} ほか ${titles.length - 1} 件`
  return titles[0] ?? props.options[0]?.title
})
/** マウスを乗せた時に出す、選んでいる絞り込みの全部. */
const allTitles = computed(() => props.options.filter(o => modelValue.value.includes(o.key)).map(o => o.title).join('\n'))

function isSelected(key: string): boolean {
  return modelValue.value.includes(key)
}

function handleToggle(option: FilterOption): void {
  const exclusiveKeys = props.options.filter(o => o.exclusive).map(o => o.key)
  if (option.exclusive) {
    modelValue.value = [option.key]
    return
  }
  const keys = modelValue.value.filter(k => !exclusiveKeys.includes(k))
  const next = keys.includes(option.key) ? keys.filter(k => k !== option.key) : [...keys, option.key]
  modelValue.value = next.length ? next : exclusiveKeys.slice(0, 1)
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
