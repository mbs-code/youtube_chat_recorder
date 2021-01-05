import { browser, Runtime } from 'webextension-polyfill-ts'
import MessageInterface from '../lib/chrome/interface/MessageInterface'
import ReturnMessageInterface from '../lib/chrome/interface/ReturnMessageInterface'
import Logger from '../loggers/Logger'

const activeIcon = 'icons/icon-32x32.png' // 赤いやつ
const deactiveIcon = 'icons/icon-32x32-grey.png' // グレーのやつ (デフォルト)

export default class MessageHandler {
  public static async invoke(message: MessageInterface, sender: Runtime.MessageSender): Promise<ReturnMessageInterface> {
    Logger.debug('message: ' + JSON.stringify(message))

    try {
      const type = message.type
      const value = message.value
      if (type === 'BADGE') {
        await this.badgeHandler(value, sender)
        return { message, response: true }
      }

      if (type === 'ACTIVE') {
        await this.activeHandler(value, sender)
        return { message, response: true }
      }

      return { message, response: false }
    } catch (err) {
      return { message, response: err }
    }
  }

  ///

  public static async badgeHandler(value: any, sender: Runtime.MessageSender): Promise<void> {
    const text = value ? String(value) : ''
    Logger.debug('set badge: ' + text)

    await browser.browserAction.setBadgeText({
      tabId: sender.tab?.id,
      text: text,
    })
  }

  public static async activeHandler(value: any, sender: Runtime.MessageSender): Promise<void> {
    const isActive = Boolean(value)
    Logger.debug('set icon: ' + (isActive ? 'active' : 'deactive'))

    await browser.browserAction.setIcon({
      tabId: sender.tab?.id,
      path: isActive ? activeIcon : deactiveIcon
    })
  }
}
