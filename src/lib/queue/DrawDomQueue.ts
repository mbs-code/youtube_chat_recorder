import Logger from '../../loggers/Logger'
import type Chat from '../../models/Chat'
import NodeToPng from '../util/NodeToPng'
import BaseQueue from './BaseQueue'
import type SaveChatQueue from './SaveChatQueue'

export interface DrawObjects {
  chat: Chat
  node: HTMLElement
}

/** チャット要素を画像化して SaveChatQueue に流すキュー. */
export default class DrawDomQueue extends BaseQueue<DrawObjects> {
  /** 一度画像化したチャットは再描画しない. */
  public drawOnce = true

  /** 画像化済みのチャット ID. */
  protected drawnIds = new Set<string>()

  constructor(protected saveChatQueue: SaveChatQueue) {
    super()
  }

  public setDrawnIds(ids: Iterable<string>): void {
    this.drawnIds = new Set(ids)
  }

  protected async invoke(objects: DrawObjects[]): Promise<void> {
    Logger.debug(`🎨[DRAW] drawing... (item: ${objects.length})`)

    for (const obj of objects) {
      try {
        obj.chat.isImageError = false

        // 画像は保存時に storage の物が引き継がれる
        if (this.drawOnce && obj.chat.id && this.drawnIds.has(obj.chat.id)) {
          Logger.trace('🎨[DRAW] skip: ' + obj.chat.dump())
          continue
        }

        obj.chat.pngUrl = await NodeToPng.generateChatImageUrl(obj.node)
        if (obj.chat.id) this.drawnIds.add(obj.chat.id)
      } catch (err) {
        Logger.error(err)
        obj.chat.isImageError = true
        obj.chat.pngUrl = undefined
      }
    }

    Logger.debug(`🎨[DRAW] done`)
    this.saveChatQueue.push(...objects.map(e => e.chat))
  }
}
