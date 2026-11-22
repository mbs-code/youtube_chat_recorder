<template>
  <div class="pointer-events-none fixed top-4 right-4 z-50 flex w-80 flex-col gap-2" aria-live="polite">
    <TransitionGroup
      enter-from-class="translate-x-4 opacity-0"
      leave-to-class="translate-x-4 opacity-0"
      enter-active-class="transition duration-200"
      leave-active-class="transition duration-200"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="card pointer-events-auto flex items-start gap-2.5 py-2.5 pr-2 pl-3 shadow-lg"
        role="status"
      >
        <i class="mdi mt-px text-lg" :class="ICONS[toast.type]" />
        <p class="flex-1 pt-px break-all">{{ toast.message }}</p>
        <button class="btn btn-ghost btn-icon btn-sm" aria-label="閉じる" @click="dismissToast(toast.id)">
          <i class="mdi mdi-close" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
/**
 * 画面右上の通知 (トースト) の表示場所.
 *
 * - 画面に 1 つ置いておき、通知は plugins/Toast.ts の Toast.success() などで出す.
 */
import { dismissToast, type ToastType, toasts } from '../plugins/Toast'

/** 通知の種類ごとのアイコンと色. */
const ICONS: Record<ToastType, string> = {
  success: 'mdi-check-circle text-success',
  warn: 'mdi-alert text-warning',
  error: 'mdi-alert-circle text-danger',
}
</script>
