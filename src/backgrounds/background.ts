import { browser, Runtime } from 'webextension-polyfill-ts'
import MessageInterface from '../lib/chrome/interface/MessageInterface'
import ReturnMessageInterface from '../lib/chrome/interface/ReturnMessageInterface'
import MessageHandler from './MessageHandler'

// 初期化する
// browser.browserAction.setBadgeText({ text: '' })

// content script からの値受信
browser.runtime.onMessage.addListener(async function (
  message: MessageInterface,
  sender: Runtime.MessageSender
): Promise<ReturnMessageInterface> {
  const response = await MessageHandler.invoke(message, sender)
  return response
})
