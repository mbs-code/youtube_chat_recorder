import ChatFilter from '../lib/chatFilter/ChatFilter'
import ConfigStorage from '../lib/chrome/storage/ConfigStorage'
import Runtime from '../lib/chrome/Runtime'
import VideoStorage from '../lib/chrome/storage/VideoStorage'
import PageHelper from '../lib/util/PageHelper'
import retry from '../lib/util/Retry'
import Logger from '../loggers/Logger'
import Config from '../models/Config'
import Video from '../models/Video'
import BadgeManager from './BadgeManager'
import ChatHandler from './ChatHandler'

export default class PageEventer {
  protected handler: ChatHandler

  protected chatFilter: ChatFilter
  protected observer: MutationObserver

  protected video?: Video
  protected config?: Config
  protected doInitialChats: boolean // 初期チャットを取得したかどうか

  constructor(handler: ChatHandler) {
    this.handler = handler

    this.chatFilter = new ChatFilter()
    this.observer = new MutationObserver(records => {
      records.forEach(record => {
        record.addedNodes.forEach(node => this.handler.invoke(node as HTMLElement, this.chatFilter))
      })
    })

    this.doInitialChats = false
  }

  public async init(): Promise<void> {
    // config を読み込む
    await this.loadConfig()

    // スクリプトを初期化して実行する
    if (this.config?.runScript) {
      const manifest = Runtime.getManifest()
      Logger.info(manifest.name + ` ver:${manifest.version}`)
      Logger.info('⚙️[init]')

      // 動画を消しとく
      this.handler.removeVideo()

      // ページに event listener を付与する
      await this.attachEventListener()
    }
  }

  public async loadConfig(): Promise<void> {
    const config = await ConfigStorage.get()
    this.config = config
    this.config.initApp()
    this.chatFilter.setChatFilters(this.config.chatFilters)

    Logger.info('⚙️[Load] load config')
    Logger.trace('> config: ' + JSON.stringify(config))
  }

  /// ////////////////////////////////////////////////////////////

  protected async beforeConnect(): Promise<boolean> {
    // 初期化
    this.doInitialChats = false
    this.observer.disconnect() // 一応 observer を止めとく

    // icon をグレーにする
    await BadgeManager.deactivateIcon()
    await BadgeManager.clearBadgeCounter()

    // url から id を抜き出す
    const videoId = PageHelper.getPageVideoId()
    Logger.debug('VideoID(URL): ' + videoId)

    // video を取得する
    const videoData = await PageHelper.getVideoData()
    if (!videoData) throw new Error('missing video data')

    // video を変換して保存する
    const video = await Video.createByElement(videoData)
    this.video = video // 自身で保持する video を変更
    await VideoStorage.save(video)
    Logger.trace('video: ' + JSON.stringify(video))

    // 動画ページなら icon を待機中にする
    await BadgeManager.waitingIcon()
    await BadgeManager.clearBadgeCounter()

    // 配信かどうか確認する
    if (video.isBroadcast) {
      Logger.trace('is boadcast')
      return true
    }

    return false
  }

  protected async onConnected(e: Element): Promise<void> {
    Logger.info('⚙️[start] observer')
    if (!this.video) {
      throw new Error('Video not found')
    }

    // video を設定して observer 開始
    await this.handler.setVideo(this.video)
    this.observer.observe(e, {
      childList: true,
      subtree: true,
    })

    // icon をアクティブにする
    await BadgeManager.activateIcon()
    await BadgeManager.clearBadgeCounter()

    // 今表示されてるものを処理する (promise はスルー)
    // コメント追加にラグがあるのでいい感じに全部取れるはず
    if (this.config?.captureInitialChats) {
      if (!this.doInitialChats) {
        Logger.debug('⚙️[start] handle initial chats')

        this.doInitialChats = true
        this.handler.findInvoke(e, this.chatFilter).then(() => {
          Logger.debug('⚙️[finish] handle initial chats')
        })
      }
    }
  }

  protected async onDeleted(): Promise<void> {
    // 二重実行対策
    if (this.handler.hasVideo()) {
      Logger.info('⚙️[stop] observer')
      this.observer.disconnect()
      await this.handler.removeVideo()
      // eventer で保持している video は維持する

      // icon を非アクティブにする
      await BadgeManager.deactivateIcon()
      await BadgeManager.clearBadgeCounter()
    }
  }

  /// ////////////////////////////////////////////////////////////

  protected async attachEventListener(): Promise<void> {
    // 一度イベントを実行
    await this.ytPageDataUpdatedEvent()

    // window 更新検知イベントを付与
    window.addEventListener('yt-page-data-updated', this.boundYtOageDataUpdateEvent)
  }

  /// ////////////////////////////////////////////////////////////

  // window 更新検知イベントを付与
  protected boundYtOageDataUpdateEvent = () => this.ytPageDataUpdatedEvent()
  protected async ytPageDataUpdatedEvent() {
    Logger.debug('🔥<yt-page-data-updated>')

    try {
      // もし読み込んでたら読み込んでいた監視を終了
      if (this.handler.hasVideo()) {
        await this.onDeleted()
      }

      // 前処理 (return false で処理中断)
      const res = await this.beforeConnect()
      if (!res) {
        Logger.info('⚙️[stop] This video is not a target')
        return
      }

      // 親の dom を取得
      const parent = await retry(() => document.querySelector<HTMLElement>('ytd-live-chat-frame#chat'))
      if (!parent) throw new Error('missing parent chat dom')

      // parent に remove event を付与する
      parent.addEventListener('DOMNodeRemoved', this.boundParentRemovedEvent)
      Logger.trace('⚙️[attach] <DOMNodeRemoved> chat parent')

      // iframe を取得
      const iframe = await retry(() => parent.querySelector<HTMLIFrameElement>('iframe#chatframe'))
      if (!iframe) throw new Error('missing chat iframe')

      // iframe がロードされ次第処理する
      iframe.addEventListener('load', this.boundIframeLoadEvent)
      Logger.trace('⚙️[attach] <load> chat iframe')

      Logger.info('⚙️[bind] bind event to chat iframe')
    } catch (err) {
      Logger.error(err)

      // 監視を終了する
      await this.onDeleted()
    }
  }

  // parent に remove event を付与する
  protected boundParentRemovedEvent = (e: Event) => this.parentRemovedEvent(e)
  protected async parentRemovedEvent(e: Event) {
    Logger.debug('🔥<DOMNodeRemoved> chat parent')

    const parent = e.currentTarget
    if (!parent || !(parent instanceof HTMLElement)) {
      console.log('parent とれんわ！')
      return
    }

    // リスナー削除
    parent.removeEventListener('DOMNodeRemoved', this.parentRemovedEvent)

    // 監視終了
    await this.onDeleted()
  }

  // iframe がロードされ次第処理する
  protected boundIframeLoadEvent = (e: Event) => this.iframeLoadEvent(e)
  protected async iframeLoadEvent(e: Event): Promise<void> {
    Logger.debug('🔥<load> chat iframe')

    const iframe = e.currentTarget
    if (!iframe || !(iframe instanceof HTMLIFrameElement)) {
      console.log('chat iframe とれんわ！')
      return
    }

    // iframe document を取得
    const iframeDoc = iframe.contentWindow?.document
    if (!iframeDoc) throw new Error('missing chat iframe document')

    // chatapp を取得
    const chatapp = await retry(() => iframeDoc.querySelector<Element>('yt-live-chat-app'))
    if (!chatapp) throw new Error('missing chat app dom')

    // スクロールエリアの取得
    const scroller = await retry(() => iframeDoc.querySelector<Element>('#item-scroller'))
    if (!scroller) throw new Error('missing scroller dom')

    // 監視開始
    await this.onConnected(scroller)
    // iframe.removeEventListener('load', iframeLoadEvent) // イベントは外さない
  }

}
