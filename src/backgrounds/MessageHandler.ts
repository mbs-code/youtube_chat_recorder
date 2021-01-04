import { browser, Runtime } from 'webextension-polyfill-ts'
import RuntimeMessageInterface from '../interface/RuntimeMessageInterface'

const activeIcon = 'images/icon-32x32.png' // 赤いやつ
const deactiveIcon = 'images/icon-32x32-grey.png' // グレーのやつ (デフォルト)

export default class MessageHandler {
  public static async invoke(message: RuntimeMessageInterface, sender: Runtime.MessageSender) {
    console.log('get', message)

    const type = message.type
    const value = message.value
    if (type === 'badge') {
      const text = value ? String(value) : ''
      await this.badgeHandler(text, sender)
    }

    if (type === 'active') {
      const isActive = Boolean(value)
      await this.activeHandler(isActive, sender)
    }
  }

  ///

  public static async badgeHandler(text: string, sender: Runtime.MessageSender) {
    await browser.browserAction.setBadgeText({
      tabId: sender.tab?.id,
      text: text,
    })
  }

  public static async activeHandler(isActive: boolean, sender: Runtime.MessageSender) {
    await browser.browserAction.setIcon({
      tabId: sender.tab?.id,
      path: isActive ? activeIcon : deactiveIcon
    })
  }
}
