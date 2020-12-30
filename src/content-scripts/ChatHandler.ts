import VideoStorage from '../lib/chrome/VideoStorage'
import DrawDomQueue from '../lib/queue/DrawDomQueue'
import SaveChatQueue from '../lib/queue/SaveChatQueue'
import retry from '../lib/util/Retry'
import Chat from '../models/Chat'
import Config from '../models/Config'
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
    console.log(`✋[Handler] set video (${video.dump()})`)
    console.log('> ' + JSON.stringify(video))
    this.video = video
    this.saveChatQueue.setVideo(video)

    // storage に保存
    await VideoStorage.save(video)
    console.log(await VideoStorage.getAll())
  }

  public async removeVideo(): Promise<boolean> {
    if (this.video) {
      const text = this.video.dump()
      console.log(`✋[Handler] remove video (${text})`)

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
   * @param {Config} [config] 設定モデル
   */
  public async findInvoke(node: Element, config?: Config): Promise<void> {
    const doms = await retry(() => Array.from(node.querySelectorAll(COMMENT_NODE_NAMES.join(', '))))
    if (!doms) return

    for (const node of doms) {
      await this.invoke(node as HTMLElement, config)
    }
  }

  /**
   * handler を実行する.
   *
   * @param {HTMLElement} node 対象のルートノード, COMMENT_NODE_NAMES を参照
   * @param {Config} [config] 設定モデル
   * @return {boolean} 成功可否
   */
  public async invoke(node: HTMLElement, config?: Config): Promise<boolean> {
    // video とIDが無ければ失敗
    if (!this.video || !this.video.id) {
      return false
    }

    // config が無ければ失敗
    if (!config) {
      return false
    }

    // コメント対象の DOM か判定する
    const nodeName = node.nodeName.toLowerCase()
    if (COMMENT_NODE_NAMES.indexOf(nodeName) === -1) {
      return false
    }

    // チャット model に変換 (videoが無くても取得はする？)
    const chat = await Chat.createByElement(this.video, node)

    // テストで「あ」が入ってたら追加
    if (chat.message?.includes('は')) {
      console.log('> ' + chat.dump())
      this.drawDomQueue.push({ node, chat })
    }

    return true
  }
}
