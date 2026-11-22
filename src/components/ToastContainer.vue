<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="toast in toasts" :key="toast.id" class="toast card" role="status">
        <i class="mdi" :class="ICONS[toast.type]" />
        <p class="message">{{ toast.message }}</p>
        <button class="btn btn-ghost is-icon is-small" aria-label="閉じる" @click="dismissToast(toast.id)">
          <i class="mdi mdi-close" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { dismissToast, type ToastType, toasts } from '../plugins/Toast'

const ICONS: Record<ToastType, string> = {
  success: 'mdi-check-circle is-success',
  warn: 'mdi-alert is-warning',
  error: 'mdi-alert-circle is-error',
}
</script>

<style scoped>
.toasts {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 320px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 8px 10px 12px;
  box-shadow: 0 10px 24px rgb(0 0 0 / 0.1);
  pointer-events: auto;

  & > .mdi {
    margin-top: 1px;
    font-size: 18px;
  }
}

.message {
  flex: 1;
  padding-top: 1px;
  word-break: break-all;
}

.is-success {
  color: var(--success);
}

.is-warning {
  color: var(--warning);
}

.is-error {
  color: var(--danger);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
</style>
