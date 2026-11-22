import ChatFilter from '../lib/chatFilter/ChatFilter'
import ConfigStorage from '../lib/chrome/storage/ConfigStorage'
import VideoStorage from '../lib/chrome/storage/VideoStorage'
import Runtime from '../lib/chrome/Runtime'
import VideoParser from '../lib/parser/VideoParser'
import PageHelper from '../lib/util/PageHelper'
import retry from '../lib/util/Retry'
import Logger from '../loggers/Logger'
import type VideoData from '../interface/VideoData'
import type Config from '../models/Config'
import type Video from '../models/Video'
import BadgeManager from './BadgeManager'
import type ChatHandler from './ChatHandler'

/** YouTube の SPA 遷移を検知するイベント (ページのデータ更新完了). */
const PAGE_UPDATED_EVENT = 'yt-page-data-updated'

const CHAT_FRAME_SELECTOR = 'ytd-live-chat-frame#chat'
const CHAT_IFRAME_SELECTOR = 'iframe#chatframe'
const CHAT_SCROLLER_SELECTOR = 'yt-live-chat-item-list-renderer #item-scroller'

/** 配信中の「〇人が視聴中」の表示 (aria-label に数字が全桁で入る). */
const VIEW_COUNT_SELECTOR = '#view-count[aria-label]'
/** 同時接続数を読む間隔 (msec). */
const VIEWERS_INTERVAL = 30 * 1000

/**
 * ページの状態を監視し、チャット欄が現れたら ChatHandler に流す.
 *
 * 流れ:
 *   yt-page-data-updated -> 動画情報を取得 (page-bridge 経由) -> 保存
 *     -> (ライブ配信なら) チャット iframe を探す -> iframe 内の #item-scroller を MutationObserver で監視
 */
export default class PageEventer {
  protected chatFilter = new ChatFilter()
  protected config?: Config
  protected video?: Video

  /** チャットの追加を監視する. */
  protected chatObserver = new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach(node => void this.handler.invoke(node, this.chatFilter))
    }
  })

  /** チャット欄 (iframe) の削除を監視する. (DOMNodeRemoved は Chrome 127 で廃止された) */
  protected removalObserver?: MutationObserver
  protected chatIframe?: HTMLIFrameElement

  /** 同時接続数を定期的に読むタイマー. */
  protected viewersTimer?: ReturnType<typeof setInterval>

  /** 遷移ごとに増える番号. 非同期処理の途中で遷移したら古い処理を捨てるために使う. */
  protected generation = 0
  protected doInitialChats = false

  constructor(protected handler: ChatHandler) {}

  public async init(): Promise<void> {
    await this.loadConfig()
    if (!this.config?.runScript) {
      Logger.info('⚙️[init] script is disabled by config')
      return
    }

    const manifest = Runtime.getManifest()
    Logger.info(`⚙️[init] ${manifest.name} ver:${manifest.version}`)

    window.addEventListener(PAGE_UPDATED_EVENT, this.onPageUpdated)
    await this.onPageUpdated()
  }

  public async loadConfig(): Promise<void> {
    const config = await ConfigStorage.get()
    config.applyToRuntime()
    this.config = config
    this.chatFilter.setChatFilters(config.chatFilters)
    this.handler.setDrawOnce(config.chatDrawOnce)

    Logger.info('⚙️[load] config')
    Logger.trace('> config: ' + JSON.stringify(config.toPlain()))
  }

  /// ////////////////////////////////////////////////////////////

  protected onPageUpdated = async (): Promise<void> => {
    Logger.debug(`🔥<${PAGE_UPDATED_EVENT}>`)
    const generation = ++this.generation

    this.stopWatchViewers()

    // 拡張機能が更新・再読み込みされたら、古い content script は何もしない
    if (!Runtime.isContextValid()) {
      this.disconnect()
      window.removeEventListener(PAGE_UPDATED_EVENT, this.onPageUpdated)
      return
    }

    try {
      this.disconnect()
      await BadgeManager.deactivateIcon()
      await BadgeManager.clearBadgeCounter()

      const video = await this.loadVideo(generation)
      if (!video || generation !== this.generation) return

      // 動画ページなら待機中にする
      await BadgeManager.waitingIcon()
      if (!video.isBroadcast) {
        Logger.info('⚙️[stop] not a live stream (no chat)')
        return
      }

      if (video.isLiveNow) this.startWatchViewers(video, generation)
      await this.attachChatFrame(generation)
    } catch (err) {
      Logger.error(err)
      if (generation === this.generation) this.disconnect()
    }
  }

  /** 動画情報を取得して保存する. 対象外なら undefined. */
  protected async loadVideo(generation: number): Promise<Video | undefined> {
    const videoId = PageHelper.getPageVideoId()
    Logger.debug('VideoID(URL): ' + videoId)
    if (!videoId) {
      Logger.debug('⚙️[stop] not a video page')
      return undefined
    }

    // SPA 遷移直後は古い動画のデータが返ってくることがあるので、ID が一致するまで待つ
    const videoData = await retry<VideoData | null | 'cancel'>(
      () => (generation === this.generation ? PageHelper.requestVideoData(videoId) : 'cancel'),
      15,
      500,
    )
    if (videoData === 'cancel' || generation !== this.generation) return undefined
    if (!videoData) throw new Error(`missing video data (${videoId})`)

    const video = VideoParser.parse(videoData)
    Logger.trace('video: ' + JSON.stringify(video.toPlain()))

    if (!video.isBroadcast && this.config?.ignoreSimpleVideo) {
      Logger.info('⚙️[stop] ignore video without chat')
      return undefined
    }

    this.video = video
    await VideoStorage.save(video, this.config?.maxVideoLength ?? 20)
    return video
  }

  /** チャット欄の iframe を探して、読み込まれたら監視を始める. */
  protected async attachChatFrame(generation: number): Promise<void> {
    const iframe = await retry(() => document.querySelector<HTMLIFrameElement>(`${CHAT_FRAME_SELECTOR} ${CHAT_IFRAME_SELECTOR}`))
    if (generation !== this.generation) return
    if (!iframe) {
      // チャットが無効な配信・非表示にしている場合など
      Logger.warn('⚙️[stop] chat frame not found')
      return
    }
    const frame = iframe.closest<HTMLElement>(CHAT_FRAME_SELECTOR)
    if (!frame) return

    this.chatIframe = iframe

    // iframe はチャットの種類 (上位/すべて) の切り替えなどで再読み込みされるので、load は付けっぱなしにする
    iframe.addEventListener('load', this.onIframeLoad)

    // チャット欄が消えたら監視を終了し、作り直されるのを待つ
    this.removalObserver = new MutationObserver(() => {
      if (iframe.isConnected || generation !== this.generation) return

      Logger.debug('🔥<removed> chat iframe')
      this.disconnect()
      this.attachChatFrame(generation).catch(err => Logger.error(err))
    })
    for (const target of [frame, frame.parentElement]) {
      if (target) this.removalObserver.observe(target, { childList: true })
    }
    Logger.info('⚙️[bind] chat iframe')

    // src 属性を使わずに読み込まれるため、既に読み込み済みのことが多い
    if (this.isChatDocumentReady(iframe)) {
      await this.connectChat(iframe, generation)
    }
  }

  protected onIframeLoad = async (event: Event): Promise<void> => {
    Logger.debug('🔥<load> chat iframe')
    const iframe = event.currentTarget as HTMLIFrameElement
    try {
      await this.connectChat(iframe, this.generation)
    } catch (err) {
      Logger.error(err)
    }
  }

  protected isChatDocumentReady(iframe: HTMLIFrameElement): boolean {
    try {
      const doc = iframe.contentDocument
      return Boolean(doc && doc.readyState !== 'loading' && /^\/live_chat/.test(doc.location.pathname))
    } catch {
      return false
    }
  }

  /** iframe 内のチャット一覧の監視を始める. */
  protected async connectChat(iframe: HTMLIFrameElement, generation: number): Promise<void> {
    const video = this.video
    if (!video || generation !== this.generation || iframe !== this.chatIframe) return

    const scroller = await retry(() => {
      const doc = iframe.contentDocument
      return doc && /^\/live_chat/.test(doc.location.pathname) ? doc.querySelector<HTMLElement>(CHAT_SCROLLER_SELECTOR) : null
    })
    if (generation !== this.generation || !iframe.isConnected) return
    if (!scroller) throw new Error('missing chat scroller')

    this.chatObserver.disconnect()
    await this.handler.setVideo(video)
    this.chatObserver.observe(scroller, { childList: true, subtree: true })
    Logger.info('⚙️[start] observe chat')

    await BadgeManager.activateIcon()

    // 既に表示されているチャットを処理する
    if (this.config?.captureInitialChats && !this.doInitialChats) {
      this.doInitialChats = true
      Logger.debug('⚙️[start] handle initial chats')
      void this.handler.findInvoke(scroller, this.chatFilter).then(() => Logger.debug('⚙️[finish] handle initial chats'))
    }
  }

  /** 配信中の同時接続数を定期的に読み、最大を超えたら保存する. */
  protected startWatchViewers(video: Video, generation: number): void {
    const videoId = video.id
    if (!videoId) return

    let max = video.maxViewers ?? 0
    const check = async () => {
      if (generation !== this.generation || !Runtime.isContextValid()) return this.stopWatchViewers()
      const viewers = Array.from(document.querySelectorAll(VIEW_COUNT_SELECTOR))
        .map(e => VideoParser.parseConcurrentViewers(e.getAttribute('aria-label')))
        .find(v => v !== undefined)
      if (viewers === undefined || viewers <= max) return

      max = viewers
      await VideoStorage.updateMaxViewers(videoId, viewers)
    }

    this.viewersTimer = setInterval(() => void check().catch(err => Logger.error(err)), VIEWERS_INTERVAL)
    setTimeout(() => void check().catch(err => Logger.error(err)), 5000) // 表示を待ってから 1 回目
    Logger.debug('⚙️[start] watch concurrent viewers')
  }

  protected stopWatchViewers(): void {
    clearInterval(this.viewersTimer)
    this.viewersTimer = undefined
  }

  /** 監視を全て止める. */
  protected disconnect(): void {
    this.chatObserver.disconnect()
    this.removalObserver?.disconnect()
    this.removalObserver = undefined
    this.chatIframe?.removeEventListener('load', this.onIframeLoad)
    this.chatIframe = undefined
    this.doInitialChats = false

    if (this.handler.removeVideo()) {
      Logger.info('⚙️[stop] observe chat')
      void BadgeManager.waitingIcon()
    }
  }
}
