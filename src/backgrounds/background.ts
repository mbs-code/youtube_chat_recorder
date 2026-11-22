/**
 * Service Worker (MV3).
 *
 * - 状態は持たない (いつ停止・再起動されても良いように).
 * - content script からの依頼でタブごとのアイコンとバッジを更新する.
 */
import ConfigStorage from '../lib/chrome/storage/ConfigStorage'
import { type BackgroundMessage, type IconState, isBackgroundMessage, listenMessages } from '../lib/chrome/messages'
import Logger from '../loggers/Logger'

const ICONS: Record<IconState, string> = {
  active: 'icons/icon-32x32.png', // 赤: 監視中
  waiting: 'icons/icon-32x32-blue.png', // 青: 待機中
  inactive: 'icons/icon-32x32-grey.png', // グレー: 対象外 (デフォルト)
}

async function applyConfig(): Promise<void> {
  const config = await ConfigStorage.get()
  config.applyToRuntime()
}

async function handleMessage(message: BackgroundMessage, sender: chrome.runtime.MessageSender): Promise<void> {
  Logger.debug('💻[message]: ' + JSON.stringify(message))
  const tabId = sender.tab?.id

  switch (message.type) {
    case 'YCR_LOAD_CONFIG':
      await applyConfig()
      return
    case 'YCR_SET_BADGE':
      await chrome.action.setBadgeText({ tabId, text: message.text })
      return
    case 'YCR_SET_ICON':
      await chrome.action.setIcon({ tabId, path: ICONS[message.state] })
      return
  }
}

listenMessages(isBackgroundMessage, handleMessage)

applyConfig().catch(err => Logger.error(err))
