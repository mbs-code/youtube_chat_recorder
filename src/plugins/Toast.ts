import { reactive } from 'vue'

/** 通知の種類. */
export type ToastType = 'success' | 'warn' | 'error'

/** 表示中の通知 1 件. */
export interface ToastItem {
  id: number
  type: ToastType
  message: string
}

/** 自動で消えるまでの時間 (msec). */
const DURATION = 4000

/** 表示中のトースト. ToastContainer.vue が描画する. */
export const toasts = reactive<ToastItem[]>([])

/** 通知の ID の連番. */
let sequence = 0

/** 通知を閉じる. */
export function dismissToast(id: number): void {
  const index = toasts.findIndex(t => t.id === id)
  if (index >= 0) toasts.splice(index, 1)
}

/** 通知を出し、DURATION 後に自動で閉じる. */
function show(type: ToastType, message: string): void {
  const id = ++sequence
  toasts.push({ id, type, message })
  setTimeout(() => dismissToast(id), DURATION)
}

/** 画面右上に通知を出す. (画面に <ToastContainer /> を置いておくこと) */
export default class Toast {
  public static success(message: string): void {
    show('success', message)
  }

  public static warn(message: string): void {
    show('warn', message)
  }

  public static error(message: string): void {
    show('error', message)
  }
}
