import Logger from '../../loggers/Logger'
import Chat from '../../models/Chat'
import NodeToPng from '../util/NodeToPng'
import BaseQueue from './BaseQueue'
import SaveChatQueue from './SaveChatQueue'

export interface DrawObjects {
  chat: Chat
  node: HTMLElement
}

export default class DrawDomQueue extends BaseQueue<DrawObjects> {
  protected saveChatQueue: SaveChatQueue

  constructor(saveChatQueue: SaveChatQueue) {
    super()
    this.saveChatQueue = saveChatQueue
  }

  protected async invoke(objects: DrawObjects[]): Promise<void> {
    Logger.debug(`🎨[DRAW] drawing... (item: ${objects.length})`)

    // 一枚ずつ書いていく
    for (const obj of objects) {
      try {
        // 値のリセット
        obj.chat.isImageError = false

        // スクロールさせる
        // const scroller = obj.node.closest('#item-scroller') as HTMLElement
        // if (obj.scroller) {
        //   var topPos = obj.node.offsetTop
        //   obj.scroller.scrollTop = topPos
        // }

        // chat に url があったら無視する (軽量化対策)
        // if (!obj.chat.pngUrl) {
          const dataUrl = await NodeToPng.generage(obj.node)
          obj.chat.pngUrl = dataUrl
        // }
      } catch (err) {
        Logger.error(err)
        obj.chat.isImageError = true
        obj.chat.pngUrl = undefined
      }
    }

    Logger.debug(`🎨[DRAW] success!`)

    // チャットを取り出して保存キューへ
    const chats = objects.map(e => e.chat)
    this.saveChatQueue.push(...chats)
  }
}
