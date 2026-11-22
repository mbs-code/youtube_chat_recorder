/**
 * content script (isolated world).
 *
 * YouTube のページでチャット欄を監視し、設定に従ってチャットを保存・画像化する.
 * ページの JS オブジェクトが必要な処理は page-bridge (MAIN world) に問い合わせる.
 */
import { isTabMessage, listenMessages } from '../lib/chrome/messages'
import Runtime from '../lib/chrome/Runtime'
import BadgeManager from './BadgeManager'
import ChatHandler from './ChatHandler'
import PageEventer from './PageEventer'

if (import.meta.env.DEV) {
  const manifest = Runtime.getManifest()
  console.log(`[YCR][dev] ${manifest.name} ver: ${manifest.version}, loaded: ${new Date().toLocaleString()}`)
}

// popup からのメッセージ
listenMessages(isTabMessage, async message => {
  switch (message.type) {
    case 'YCR_RESET_BADGE':
      await BadgeManager.clearBadgeCounter()
      return
  }
})

const eventer = new PageEventer(new ChatHandler())
void eventer.init()
