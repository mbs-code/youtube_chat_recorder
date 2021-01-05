import { format as dateFormat } from 'date-fns'
import { browser, Runtime as BrowserRuntime } from 'webextension-polyfill-ts'
import MessageHandler from './MessageHandler'
import MessageInterface from '../lib/chrome/interface/MessageInterface'
import ReturnMessageInterface from '../lib/chrome/interface/ReturnMessageInterface'
import Runtime from '../lib/chrome/Runtime'
import ChatHandler from './ChatHandler'
import PageEventer from './PageEventer'

// debug logging
if (process.env.NODE_ENV === 'development') {
  const manifest = Runtime.getManifest()
  const date = dateFormat(new Date(), 'yyyy-MM-dd_HH:mm:ss')
  console.log(`[dev] ${manifest.name} ver: ${manifest.version}, build: ${date}`)
}

// popup, background からの値受信
browser.runtime.onMessage.addListener(async function (
  message: MessageInterface,
  sender: BrowserRuntime.MessageSender
): Promise<ReturnMessageInterface> {
  const response = await MessageHandler.invoke(message, sender)
  return { message, response }
})

// 初期化する
const init = async () => {
  const handler = new ChatHandler()
  const eventer = new PageEventer(handler)
  await eventer.init()
}
init()
