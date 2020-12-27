import PageHelper from '../lib/util/PageHelper'
import retry from '../lib/util/Retry'
import ChatHandler from './ChatHandler'

export default class PageEventer {
  protected handler: ChatHandler
  protected observer: MutationObserver

  constructor(handler: ChatHandler) {
    this.handler = handler
    this.observer = new MutationObserver(records => {
      records.forEach(record => {
        record.addedNodes.forEach(node => this.handler.invoke(node as HTMLElement))
      })
    })
  }

  public async init(): Promise<void> {
    console.log('> init')

    // ページに event listener を付与する
    await this.attachEventListener()
  }

  /// ////////////////////////////////////////////////////////////

  protected async beforeConnect(): Promise<boolean> {
    // 一応 observer を止めとく
    this.observer.disconnect()

    const videoId = PageHelper.getPageVideoId()
    console.log('videoID:', videoId)

    const videoData = await PageHelper.getVideoData()
    console.log(videoData)

    return true
  }

  protected async onConnected(e: HTMLElement): Promise<void> {
    this.handler.findInvoke(e)

    this.observer.observe(e, {
      childList: true,
      subtree: true,
    })
  }

  protected async onDeleted(): Promise<void> {
    console.log('> stop ovserver')
    this.observer.disconnect()
  }

  /// ////////////////////////////////////////////////////////////

  protected async attachEventListener(): Promise<void> {
    const init = async () => {
      // 前処理
      const res = await this.beforeConnect()
      if (!res) throw new Error('return false of beforeConnect()')

      // 親の dom を取得
      const parent = await retry(() => document.querySelector('ytd-live-chat-frame#chat'))
      if (!parent) throw new Error('missing parent chat dom')

      // parent に remove event を付与する
      const parentRemovedEvent = async (e: Event) => {
        console.log('> DOMNodeRemoved')
        if (e.target === parent) {
          parent.removeEventListener('DOMNodeRemoved', parentRemovedEvent)

          // 監視終了
          this.onDeleted()
        }
      }
      parent.addEventListener('DOMNodeRemoved', parentRemovedEvent)

      // iframe を取得
      const iframe = await retry(() => parent.querySelector<HTMLIFrameElement>('iframe#chatframe'))
      if (!iframe) throw new Error('missing chat iframe')

      // iframe がロードされ次第処理する
      iframe.addEventListener('load', async () => {
        console.log('> load chat iframe')

        // iframe document を取得
        const iframeDoc = iframe.contentWindow?.document
        if (!iframeDoc) throw new Error('missing chat iframe document')

        // chatapp を取得
        const chatapp = await retry(() => iframeDoc.querySelector<HTMLElement>('yt-live-chat-app'))
        if (!chatapp) throw new Error('missing chat app dom')

        // 監視開始
        await this.onConnected(chatapp)
      })
    }
    await init()

    window.addEventListener('yt-page-data-updated', init)
  }
}
