import retry from '../lib/util/Retry'
import Chat from '../models/Chat'

export default class ChatHandler {
  public static readonly COMMENT_NODE_NAMES = [
    'yt-live-chat-text-message-renderer',
    'yt-live-chat-paid-message-renderer',
    'yt-live-chat-membership-item-renderer',
    'yt-live-chat-paid-sticker-renderer',
    // 'yt-live-chat-banner-renderer', // 固定ツイ予約
  ]

  public async findInvoke(node: Element): Promise<void> {
    const doms = await retry(() => Array.from(node.querySelectorAll(ChatHandler.COMMENT_NODE_NAMES.join(', '))))
    if (!doms) return

    for (const node of doms) {
      await this.invoke(node)
    }
  }

  public async invoke(node: Element): Promise<boolean> {
    // コメント対象の DOM か判定する
    const nodeName = node.nodeName.toLowerCase()
    if (ChatHandler.COMMENT_NODE_NAMES.indexOf(nodeName) === -1) {
      return false
    }

    // チャット model に変換
    const chat = await Chat.createByElement(node)

    console.log([node, chat])
    console.log('> ' + chat.dump())

    return true
  }
}
