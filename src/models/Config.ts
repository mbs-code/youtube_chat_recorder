import ChatFilter from '../lib/chatFilter/ChatFilter'
import { ChatFilterConfigInterface } from '../lib/chatFilter/ChatFilterInterface'
import VideoStorage from '../lib/chrome/VideoStorage'
import TransformDate from '../lib/decorator/TransformDate'
import FilenameFormatter from '../lib/util/FilenameFormatter'
import Logger, { LogLevel } from '../loggers/Logger'
import Chat from './Chat'
import Video from './Video'

export default class Config {
  // chat のフィルタリング
  chatFilters: ChatFilterConfigInterface[]

  // 結合ファイル名
  mergeImageFileName: string

  // 画像を保管する
  // @Transform(value => Boolean(value), { toClassOnly: true })
  // @Transform(value => value instanceof Boolean ? value : undefined, { toPlainOnly: true })
  complementImage: boolean = false

  // 最大保存video数
  maxVideoLength: number

  // ログレベル
  showLogLevel: LogLevel

  @TransformDate()
  createdAt?: Date // 作成日時

  @TransformDate()
  updatedAt?: Date // 更新日時

  constructor() {
    // 初期値
    this.chatFilters = ChatFilter.generateDefaultChatfilterConfigs()
    this.mergeImageFileName = '%now%'
    this.complementImage = false
    this.maxVideoLength = 10

    this.showLogLevel = 'warn'
  }

  /**
   * アプリに設定値を付与する.
   */
  public initApp() {
    VideoStorage.MAX_LENGTH = this.maxVideoLength
    Logger.SHOW_LOG_LEVEL = this.showLogLevel
  }

  // ファイル名フォーマット
  public formatFilename(video: Video, chats: Chat[]) {
    return FilenameFormatter.format(this.mergeImageFileName, video, chats)
  }
}
