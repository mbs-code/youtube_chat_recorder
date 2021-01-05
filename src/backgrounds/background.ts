import { browser, Runtime } from 'webextension-polyfill-ts'
import ConfigStorage from '../lib/chrome/storage/ConfigStorage'
import MessageInterface from '../lib/chrome/interface/MessageInterface'
import ReturnMessageInterface from '../lib/chrome/interface/ReturnMessageInterface'
import Logger from '../loggers/Logger'
import MessageHandler from './MessageHandler'

// content script からの値受信
browser.runtime.onMessage.addListener(async function (
  message: MessageInterface,
  sender: Runtime.MessageSender
): Promise<ReturnMessageInterface> {
  const response = await MessageHandler.invoke(message, sender)
  return { message, response }
})

// 初期化する
const init = async () => {
  Logger.debug('init')
  browser.browserAction.setBadgeText({ text: '' })

  // 設定を読み込んでおく
  Logger.debug('load config')
  const config = await ConfigStorage.get()
  config.initApp()
}
init()
