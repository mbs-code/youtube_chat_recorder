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

  constructor(saveChatQueue: SaveChatQueue, interval?: number) {
    super(interval)
    this.saveChatQueue = saveChatQueue
  }

  protected async invoke(objects: DrawObjects[]): Promise<void> {
    console.log(`🎨[DRAW] drawing... (item: ${objects.length})`)

    // 一枚ずつ書いていく
    for (const obj of objects) {
      try {
        // chat に url があったら無視する (軽量化対策)
        if (!obj.chat.pngUrl) {
          const dataUrl = await NodeToPng.generage(obj.node)
          obj.chat.pngUrl = dataUrl
        }
      } catch (err) {
        throw err
      }
    }
    console.log(`🎨[DRAW] success!`)

    // チャットを取り出して保存キューへ
    const chats = objects.map(e => e.chat)
    this.saveChatQueue.push(...chats)
  }
}
