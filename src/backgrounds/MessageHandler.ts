import { browser, Runtime } from 'webextension-polyfill-ts'
import ConfigStorage from '../lib/chrome/storage/ConfigStorage'
import MessageInterface from '../lib/chrome/interface/MessageInterface'
import Logger from '../loggers/Logger'

const activeIcon = 'icons/icon-32x32.png' // 赤いやつ
const deactiveIcon = 'icons/icon-32x32-grey.png' // グレーのやつ (デフォルト)

export default class MessageHandler {
  public static async invoke(message: MessageInterface, sender: Runtime.MessageSender): Promise<boolean | Error> {
    Logger.debug('message: ' + JSON.stringify(message))

    try {
      const type = message.type
      const value = message.value

      switch(type) {
        case 'LOAD_CONFIG':
          await this.loadHandler(sender)
          return true
        case 'BADGE':
          await this.badgeHandler(value, sender)
          return true
        case 'ACTIVE':
          await this.activeHandler(value, sender)
          return true
        default:
          return false
      }
    } catch (err) {
      return err
    }
  }

  ///

  public static async loadHandler(sender: Runtime.MessageSender): Promise<void> {
    Logger.debug('load config')
    const config = await ConfigStorage.get()
    config.initApp()
  }

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
