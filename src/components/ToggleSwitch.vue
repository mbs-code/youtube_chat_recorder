<template>
  <label class="flex cursor-pointer items-start gap-4 py-2.5" :class="{ 'cursor-not-allowed opacity-50': disabled }">
    <span class="flex-1">
      <span class="block font-medium text-zinc-950"><slot /></span>
      <span v-if="$slots.description" class="mt-0.5 block text-xs/normal text-zinc-500"><slot name="description" /></span>
    </span>
    <input v-model="model" type="checkbox" role="switch" class="peer sr-only" :disabled="disabled" />
    <span
      class="relative mt-0.5 h-5 w-9 shrink-0 rounded-full bg-zinc-300 transition-colors peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-ring"
      aria-hidden="true"
    >
      <span
        class="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform"
        :class="{ 'translate-x-4': model }"
      />
    </span>
  </label>
</template>

<script setup lang="ts">
defineProps<{ disabled?: boolean }>()
const model = defineModel<boolean>({ required: true })
</script>
