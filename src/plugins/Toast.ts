import { reactive } from 'vue'

export type ToastType = 'success' | 'warn' | 'error'

export interface ToastItem {
  id: number
  type: ToastType
  message: string
}

const DURATION = 4000

/** 表示中のトースト. ToastContainer.vue が描画する. */
export const toasts = reactive<ToastItem[]>([])

let sequence = 0

export function dismissToast(id: number): void {
  const index = toasts.findIndex(t => t.id === id)
  if (index >= 0) toasts.splice(index, 1)
}

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
