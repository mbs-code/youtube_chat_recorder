import { Runtime } from 'webextension-polyfill-ts'
// import ConfigStorage from '../lib/chrome/storage/ConfigStorage'
import MessageInterface from '../lib/chrome/interface/MessageInterface'
import Logger from '../loggers/Logger'
import BadgeManager from './BadgeManager'

export default class MessageHandler {
  public static async invoke(message: MessageInterface, sender: Runtime.MessageSender): Promise<boolean | Error> {
    Logger.debug('💻[message]: ' + JSON.stringify(message))

    try {
      const type = message.type
      const value = message.value

      switch(type) {
        // case 'LOAD_CONFIG':
        //   await this.loadHandler(sender)
        //   return true
        case 'BADGE':
          await this.clearBadgeHandler(value)
          return true
        default:
          return false
      }
    } catch (err) {
      return err
    }
  }

  ///

  // public static async loadHandler(sender: Runtime.MessageSender): Promise<void> {
  //   Logger.debug('load config')
  //   const config = await ConfigStorage.get()
  //   config.initApp()
  // }

  public static async clearBadgeHandler(sender: Runtime.MessageSender): Promise<void> {
    Logger.debug('💻 > clear badge')

    await BadgeManager.clearBadgeCounter()
  }
}
