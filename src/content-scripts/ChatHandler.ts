import ChatFilter from '../lib/chatFilter/ChatFilter'
import VideoStorage from '../lib/chrome/storage/VideoStorage'
import DrawDomQueue from '../lib/queue/DrawDomQueue'
import SaveChatQueue from '../lib/queue/SaveChatQueue'
import retry from '../lib/util/Retry'
import Logger from '../loggers/Logger'
import Chat from '../models/Chat'
import Video from '../models/Video'

const COMMENT_NODE_NAMES = [
  'yt-live-chat-text-message-renderer',
  'yt-live-chat-paid-message-renderer',
  'yt-live-chat-membership-item-renderer',
  'yt-live-chat-paid-sticker-renderer',
  // 'yt-live-chat-banner-renderer', // 固定ツイの tag name
]

export default class ChatHandler {
  protected saveChatQueue: SaveChatQueue
  protected drawDomQueue: DrawDomQueue
  protected video?: Video

  constructor() {
    this.saveChatQueue = new SaveChatQueue()
    this.drawDomQueue = new DrawDomQueue(this.saveChatQueue)
    this.video = undefined
  }

  /// ////////////////////////////////////////////////////////////

  public getVideo(): Video | undefined {
    return this.video
  }

  public hasVideo(): boolean {
    return Boolean(this.video)
  }

  public async setVideo(video: Video): Promise<void> {
    Logger.debug(`✋[Handler] set video (${video.dump()})`)
    this.video = video
    this.saveChatQueue.setVideo(video)

    // storage に保存
    await VideoStorage.save(video)
  }

  public async removeVideo(): Promise<boolean> {
    if (this.video) {
      Logger.debug(`✋[Handler] remove video (${this.video.dump()})`)

      this.video = undefined
      this.saveChatQueue.removeVideo()
      return true
    }
    return false
  }

  /// ////////////////////////////////////////////////////////////

  /**
   * 対象のノードから対象の DOM を取り出し、実行する.
   *
   * @param {Element} node 対象のルートノード
   * @param {ChatFilter} chatFilter チャットフィルター
   */
  public async findInvoke(node: Element, chatFilter: ChatFilter): Promise<void> {
    const doms = await retry(() => Array.from(node.querySelectorAll(COMMENT_NODE_NAMES.join(', '))))
    if (!doms) return

    for (const node of doms) {
      await this.invoke(node as HTMLElement, chatFilter)
    }
  }

  /**
   * handler を実行する.
   *
   * @param {HTMLElement} node 対象のルートノード, COMMENT_NODE_NAMES を参照
   * @param {ChatFilter} chatFilter チャットフィルター
   * @return {boolean} 成功可否
   */
  public async invoke(node: HTMLElement, chatFilter: ChatFilter): Promise<boolean> {
    try {
      // video とIDが無ければ失敗
      if (!this.video || !this.video.id) {
        return false
      }

      // コメント対象の DOM か判定する
      const nodeName = node.nodeName.toLowerCase()
      if (COMMENT_NODE_NAMES.indexOf(nodeName) === -1) {
        return false
      }

      // チャット model に変換 (videoが無くても取得はする？)
      const chat = await Chat.createByElement(this.video, node)

      // チャットを処理する
      const taskType = chatFilter.checkChatTaskType(chat)
      if (taskType === 'image') {
        Logger.trace('💬 image: ' + chat.dump())
        this.drawDomQueue.push({ node, chat })
      } else if (taskType === 'save') {
        Logger.trace('💬 save: ' + chat.dump())
        this.saveChatQueue.push(chat)
      }

      return true
    } catch (err) {
      // 一応 try-catch
      Logger.error(err)
    }

    return false
  }
}
