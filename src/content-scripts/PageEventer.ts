import PageHelper from '../lib/util/PageHelper'
import retry from '../lib/util/Retry'
import Video from '../models/Video'
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
    console.log('⚙️[init]')

    // ページに event listener を付与する
    await this.attachEventListener()
  }

  /// ////////////////////////////////////////////////////////////

  protected async beforeConnect(): Promise<boolean> {
    // 一応 observer を止めとく
    this.observer.disconnect()

    const videoId = PageHelper.getPageVideoId()
    console.log('> VideoID:', videoId)

    const videoData = await PageHelper.getVideoData()
    if (!videoData) throw new Error('missing video data')

    const video = await Video.createByElement(videoData)
    this.handler.setVideo(video)

    return true
  }

  protected async onConnected(e: Element): Promise<void> {
    console.log('⚙️[start] ovserver')
    this.observer.observe(e, {
      childList: true,
      subtree: true,
    })

    // 今表示されてるものを処理する (promise はスルー)
    // コメント追加にラグがあるのでいい感じに全部取れるはず
    this.handler.findInvoke(e)
  }

  protected async onDeleted(): Promise<void> {
    console.log('⚙️[stop] ovserver')
    this.observer.disconnect()
    this.handler.removeVideo()
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
        console.log('🔥<DOMNodeRemoved> chat parent')
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
        console.log('🔥<load> chat iframe')

        // iframe document を取得
        const iframeDoc = iframe.contentWindow?.document
        if (!iframeDoc) throw new Error('missing chat iframe document')

        // chatapp を取得
        const chatapp = await retry(() => iframeDoc.querySelector<Element>('yt-live-chat-app'))
        if (!chatapp) throw new Error('missing chat app dom')

        // 監視開始
        await this.onConnected(chatapp)
      })
    }
    await init()

    window.addEventListener('yt-page-data-updated', async () => {
      console.log('🔥<yt-page-data-updated>')
      await init()
    })
  }
}
