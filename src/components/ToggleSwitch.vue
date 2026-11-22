<template>
  <label class="toggle" :class="{ 'is-disabled': disabled }">
    <span class="text">
      <span class="title"><slot /></span>
      <span v-if="$slots.description" class="description"><slot name="description" /></span>
    </span>
    <input v-model="model" type="checkbox" role="switch" class="sr-only" :disabled="disabled" />
    <span class="track" aria-hidden="true"><span class="thumb" /></span>
  </label>
</template>

<script setup lang="ts">
defineProps<{ disabled?: boolean }>()
const model = defineModel<boolean>({ required: true })
</script>

<style scoped>
.toggle {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 10px 0;
  cursor: pointer;

  &.is-disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.text {
  flex: 1;
}

.title {
  display: block;
  color: var(--text-strong);
  font-weight: 500;
}

.description {
  display: block;
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.track {
  position: relative;
  flex-shrink: 0;
  width: 36px;
  height: 20px;
  margin-top: 2px;
  border-radius: 999px;
  background: var(--border-strong);
  transition: background-color 0.15s;
}

.thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--white);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.2);
  transition: transform 0.15s;
}

input:checked + .track {
  background: var(--primary);

  & .thumb {
    transform: translateX(16px);
  }
}

input:focus-visible + .track {
  outline: 2px solid var(--primary-ring);
  outline-offset: 2px;
}
</style>
