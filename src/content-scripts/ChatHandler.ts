import retry from '../lib/util/Retry'
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
  protected video?: Video

  constructor() {
    this.video = undefined
  }

  /// ////////////////////////////////////////////////////////////

  public getVideo(): Video | undefined {
    return this.video
  }

  public setVideo(video: Video): void {
    console.log(`✋[Handler] set video (${video.dump()})`)
    console.log('> ' + JSON.stringify(video))
    this.video = video
  }

  public removeVideo(): boolean {
    const text = this.video ? this.video.dump() : 'undefined'
    console.log(`✋[Handler] remove video (${text})`)

    if (this.video) {
      this.video = undefined
      return true
    }
    return false
  }

  /// ////////////////////////////////////////////////////////////

  /**
   * 対象のノードから対象の DOM を取り出し、実行する.
   *
   * @param {Element} node 対象のルートノード
   */
  public async findInvoke(node: Element): Promise<void> {
    const doms = await retry(() => Array.from(node.querySelectorAll(COMMENT_NODE_NAMES.join(', '))))
    if (!doms) return

    for (const node of doms) {
      await this.invoke(node)
    }
  }

  /**
   * handler を実行する.
   *
   * @param {Element} node 対象のルートノード, COMMENT_NODE_NAMES を参照
   * @return {boolean} 成功可否
   */
  public async invoke(node: Element): Promise<boolean> {
    // コメント対象の DOM か判定する
    const nodeName = node.nodeName.toLowerCase()
    if (COMMENT_NODE_NAMES.indexOf(nodeName) === -1) {
      return false
    }

    // チャット model に変換
    const chat = await Chat.createByElement(node)

    console.log([node, chat])
    console.log('> ' + chat.dump())

    return true
  }
}
