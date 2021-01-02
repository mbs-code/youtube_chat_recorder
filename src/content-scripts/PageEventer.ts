import ChatFilter from '../lib/chatFilter/ChatFilter'
import ConfigStorage from '../lib/chrome/Configstorage'
import VideoStorage from '../lib/chrome/VideoStorage'
import PageHelper from '../lib/util/PageHelper'
import retry from '../lib/util/Retry'
import Config from '../models/Config'
import Video from '../models/Video'
import ChatHandler from './ChatHandler'

export default class PageEventer {
  protected handler: ChatHandler

  protected chatFilter: ChatFilter
  protected observer: MutationObserver

  protected config?: Config

  constructor(handler: ChatHandler) {
    this.handler = handler

    this.chatFilter = new ChatFilter()
    this.observer = new MutationObserver(records => {
      records.forEach(record => {
        record.addedNodes.forEach(node => this.handler.invoke(node as HTMLElement, this.chatFilter))
      })
    })
  }

  public async init(): Promise<void> {
    console.log('⚙️[init]')

    // 初期化
    this.handler.removeVideo()

    // config を読み込む
    await this.loadConfig()

    // ページに event listener を付与する
    await this.attachEventListener()
  }

  public async loadConfig(): Promise<void> {
    const config = await ConfigStorage.get()
    this.config = config
    this.chatFilter.setChatFilters(this.config.chatFilters)
    VideoStorage.MAX_LENGTH = this.config?.maxVideoLength || 10

    console.log(`⚙️[Load] load config`)
    console.log('> config: ' + JSON.stringify(config))
  }

  /// ////////////////////////////////////////////////////////////

  protected async beforeConnect(): Promise<boolean> {
    // 一応 observer を止めとく
    this.observer.disconnect()

    const videoId = PageHelper.getPageVideoId()
    console.log('> VideoID:', videoId)

    // video を変換する
    const videoData = await PageHelper.getVideoData()
    if (!videoData) throw new Error('missing video data')

    const video = await Video.createByElement(videoData)
    await this.handler.setVideo(video)

    // 配信かどうか確認する
    if (video.isBroadcast) {
      return true
    }

    return false
  }

  protected async onConnected(e: Element): Promise<void> {
    console.log('⚙️[start] observer')
    this.observer.observe(e, {
      childList: true,
      subtree: true,
    })

    // 今表示されてるものを処理する (promise はスルー)
    // コメント追加にラグがあるのでいい感じに全部取れるはず
    this.handler.findInvoke(e, this.chatFilter).then(() => {
      console.log('⚙️[finish] handle display chats')
    })
  }

  protected async onDeleted(): Promise<void> {
    if (this.handler.hasVideo()) {
      console.log('⚙️[stop] observer')
      this.observer.disconnect()
      await this.handler.removeVideo()
    }
  }

  /// ////////////////////////////////////////////////////////////

  protected async attachEventListener(): Promise<void> {
    const init = async () => {
      // もし読み込んでたら監視終了
      if (this.handler.hasVideo()) {
        await this.onDeleted()
      }

      // 前処理 (return false で処理中断)
      const res = await this.beforeConnect()
      if (!res) {
        console.log('⚙[stop] This video is not a target')
        return
      }

      // 親の dom を取得
      const parent = await retry(() => document.querySelector('ytd-live-chat-frame#chat'))
      if (!parent) throw new Error('missing parent chat dom')

      // parent に remove event を付与する
      const parentRemovedEvent = async (e: Event) => {
        console.log('🔥<DOMNodeRemoved> chat parent')
        if (e.target === parent) {
          parent.removeEventListener('DOMNodeRemoved', parentRemovedEvent)

          // 監視終了
          await this.onDeleted()
        }
      }
      parent.addEventListener('DOMNodeRemoved', parentRemovedEvent)

      // iframe を取得
      const iframe = await retry(() => parent.querySelector<HTMLIFrameElement>('iframe#chatframe'))
      if (!iframe) throw new Error('missing chat iframe')

      // iframe がロードされ次第処理する
      const iframeLoadEvent = async () => {
        console.log('🔥<load> chat iframe')

        // iframe document を取得
        const iframeDoc = iframe.contentWindow?.document
        if (!iframeDoc) throw new Error('missing chat iframe document')

        // chatapp を取得
        const chatapp = await retry(() => iframeDoc.querySelector<Element>('yt-live-chat-app'))
        if (!chatapp) throw new Error('missing chat app dom')

        // 監視開始
        await this.onConnected(chatapp)
        iframe.removeEventListener('load', iframeLoadEvent)
      }
      iframe.addEventListener('load', iframeLoadEvent)
    }
    await init()

    window.addEventListener('yt-page-data-updated', async () => {
      console.log('🔥<yt-page-data-updated>')
      await init()
    })
  }
}
