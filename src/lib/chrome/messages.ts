/** アイコンの状態. */
export type IconState = 'active' | 'waiting' | 'inactive'

/** content script / popup -> background. */
export type BackgroundMessage
  = { type: 'YCR_LOAD_CONFIG' } | { type: 'YCR_SET_BADGE', text: string } | { type: 'YCR_SET_ICON', state: IconState }

/** popup -> content script (tab). */
export type TabMessage = { type: 'YCR_RESET_BADGE' }

export type YcrMessage = BackgroundMessage | TabMessage

export interface MessageResponse {
  ok: boolean
  error?: string
}

const MESSAGE_TYPES: ReadonlySet<string> = new Set<YcrMessage['type']>([
  'YCR_LOAD_CONFIG',
  'YCR_SET_BADGE',
  'YCR_SET_ICON',
  'YCR_RESET_BADGE',
])

export function isYcrMessage(message: unknown): message is YcrMessage {
  return typeof message === 'object' && message !== null && MESSAGE_TYPES.has((message as { type?: string }).type ?? '')
}

/**
 * chrome.runtime.onMessage に非同期ハンドラーを登録する.
 *
 * - MV3 では Promise を返すリスナーが使えないため、sendResponse + `return true` で応答する.
 * - 自分の拡張機能以外からのメッセージは無視する.
 *
 * @param accept 担当するメッセージか判定する (担当外なら他のリスナーに任せる)
 * @param handler 処理. 例外を投げると { ok: false } を返す
 */
export function listenMessages<M extends YcrMessage>(
  accept: (message: YcrMessage) => message is M,
  handler: (message: M, sender: chrome.runtime.MessageSender) => Promise<void>,
): void {
  chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse: (res: MessageResponse) => void) => {
    if (sender.id !== chrome.runtime.id || !isYcrMessage(message) || !accept(message)) {
      return false
    }

    handler(message, sender)
      .then(() => sendResponse({ ok: true }))
      .catch((err: unknown) => sendResponse({ ok: false, error: String(err) }))
    return true // 非同期で sendResponse する
  })
}

export const isBackgroundMessage = (message: YcrMessage): message is BackgroundMessage => message.type !== 'YCR_RESET_BADGE'
export const isTabMessage = (message: YcrMessage): message is TabMessage => message.type === 'YCR_RESET_BADGE'
