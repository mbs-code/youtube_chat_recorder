import ChatFilter from '../lib/chatFilter/ChatFilter'
import { ChatFilterConfigInterface } from '../lib/chatFilter/ChatFilterInterface'
import VideoStorage from '../lib/chrome/storage/VideoStorage'
import TransformDate from '../lib/decorator/TransformDate'
import DrawDomQueue from '../lib/queue/DrawDomQueue'
import FilenameFormatter from '../lib/util/FilenameFormatter'
import Logger, { LogLevel } from '../loggers/Logger'
import Chat from './Chat'
import Video from './Video'

export default class Config {
  // chat のフィルタリング
  chatFilters: ChatFilterConfigInterface[]

  // 結合ファイル名
  mergeImageFileName: string

  // 初めに表示されるチャットを取得する
  captureInitialChats: boolean

  // 一度保存したら処理しない
  chatDrawOnce: boolean

  // 取得できていない画像を補完する
  complementImage: boolean

  // 最大保存video数
  maxVideoLength: number

  /// ////////////////////////////////////////

  // 画像保存時にスクロールさせる
  // scrollWhenChatDraw: boolean

  // スクリプトを起動させるか
  runScript: boolean

  // ログレベル
  showLogLevel: LogLevel

  /// ////////////////////////////////////////

  @TransformDate()
  createdAt?: Date // 作成日時

  @TransformDate()
  updatedAt?: Date // 更新日時

  constructor() {
    // 初期値
    this.chatFilters = ChatFilter.generateDefaultChatfilterConfigs()
    this.mergeImageFileName = '%now%'
    this.captureInitialChats = false
    this.chatDrawOnce = true
    this.complementImage = false
    this.maxVideoLength = 10

    // this.scrollWhenChatDraw = false
    this.runScript = true
    this.showLogLevel = 'warn'
  }

  /**
   * アプリに設定値を付与する.
   */
  public initApp() {
    DrawDomQueue.DRAW_ONCE = this.chatDrawOnce
    VideoStorage.MAX_LENGTH = this.maxVideoLength
    Logger.SHOW_LOG_LEVEL = this.showLogLevel
  }

  // ファイル名フォーマット
  public formatFilename(video: Video, chats: Chat[]) {
    return FilenameFormatter.format(this.mergeImageFileName, video, chats)
  }
}
