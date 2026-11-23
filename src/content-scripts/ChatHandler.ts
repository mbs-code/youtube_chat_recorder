import type ChatFilter from '../lib/chatFilter/ChatFilter'
import ChatStorage from '../lib/chrome/storage/ChatStorage'
import ChatParser, { CHAT_NODE_NAMES } from '../lib/parser/ChatParser'
import DrawDomQueue from '../lib/queue/DrawDomQueue'
import SaveChatQueue from '../lib/queue/SaveChatQueue'
import Logger from '../loggers/Logger'
import type Chat from '../models/Chat'
import type Video from '../models/Video'

const CHAT_NODE_NAME_SET: ReadonlySet<string> = new Set(CHAT_NODE_NAMES)
const CHAT_NODE_SELECTOR = CHAT_NODE_NAMES.join(', ')

/** チャット要素を受け取り、フィルターに従って保存・画像化する. */
export default class ChatHandler {
  protected saveChatQueue = new SaveChatQueue()
  protected drawDomQueue = new DrawDomQueue(this.saveChatQueue)
  protected video?: Video

  /** 解析した全てのチャット (保存しないものも含む) を受け取る. (コメント数の記録に使う) */
  public onChat?: (chat: Chat) => void

  public setDrawOnce(drawOnce: boolean): void {
    this.drawDomQueue.drawOnce = drawOnce
  }

  public hasVideo(): boolean {
    return Boolean(this.video)
  }

  public async setVideo(video: Video): Promise<void> {
    Logger.debug(`✋[Handler] set video (${video.dump()})`)
    this.video = video
    this.saveChatQueue.setVideo(video)
    this.drawDomQueue.reset()

    // 画像化済みのチャットを覚えておく (drawOnce 用)
    const chats = video.id ? await ChatStorage.get(video.id) : []
    this.drawDomQueue.setDrawnIds(chats.filter(c => c.id && c.pngUrl).map(c => c.id as string))
  }

  public removeVideo(): boolean {
    if (!this.video) return false

    Logger.debug(`✋[Handler] remove video (${this.video.dump()})`)
    this.video = undefined
    this.drawDomQueue.reset()
    this.saveChatQueue.removeVideo()
    return true
  }

  /// ////////////////////////////////////////////////////////////

  /**
   * 対象のノード以下にある全てのチャットを処理する.
   *
   * @param root 対象のルートノード
   * @param chatFilter チャットフィルター
   */
  public async findInvoke(root: Element, chatFilter: ChatFilter): Promise<void> {
    for (const node of Array.from(root.querySelectorAll<HTMLElement>(CHAT_NODE_SELECTOR))) {
      await this.invoke(node, chatFilter)
    }
  }

  /**
   * チャット要素を処理する.
   *
   * @param node 追加されたノード (CHAT_NODE_NAMES 以外は無視する)
   * @param chatFilter チャットフィルター
   * @return 処理対象だったか
   */
  public async invoke(node: Node, chatFilter: ChatFilter): Promise<boolean> {
    const video = this.video
    // ※ iframe 内のノードは realm が違うので instanceof Element は使えない
    if (!video?.id || node.nodeType !== Node.ELEMENT_NODE || !CHAT_NODE_NAME_SET.has((node as Element).localName)) {
      return false
    }

    try {
      const chat = await ChatParser.parse(video, node as Element)
      this.onChat?.(chat)

      const taskType = chatFilter.checkChatTaskType(chat)
      if (taskType === 'image') {
        Logger.trace('💬 image: ' + chat.dump())
        this.drawDomQueue.push({ node: node as HTMLElement, chat })
      } else if (taskType === 'save') {
        Logger.trace('💬 save: ' + chat.dump())
        this.saveChatQueue.push(chat)
      }
      return true
    } catch (err) {
      Logger.error(err)
      return false
    }
  }
}
