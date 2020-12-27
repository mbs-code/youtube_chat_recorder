export default class ChatHandler {
  public static readonly COMMENT_NODE_NAMES = [
    'yt-live-chat-text-message-renderer',
    'yt-live-chat-paid-message-renderer',
    'yt-live-chat-membership-item-renderer',
    'yt-live-chat-paid-sticker-renderer',
  ]

  public async findInvoke(node: HTMLElement): Promise<void> {
    const doms = node.querySelectorAll(ChatHandler.COMMENT_NODE_NAMES.join(', '))
    for (const node of Array.from(doms)) {
      await this.invoke(node as HTMLElement)
    }
  }

  public async invoke(node: HTMLElement): Promise<boolean> {
    // コメント対象の dom か判定する
    const nodeName = node.nodeName.toLowerCase()
    if (ChatHandler.COMMENT_NODE_NAMES.indexOf(nodeName) === -1) {
      return false
    }

    console.log('> comment')
    return true
  }
}
