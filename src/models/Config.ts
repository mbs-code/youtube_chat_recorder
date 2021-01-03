import ChatFilter from '../lib/chatFilter/ChatFilter'
import { ChatFilterConfigInterface } from '../lib/chatFilter/ChatFilterInterface'
import TransformDate from '../lib/decorator/TransformDate'
import FilenameFormatter from '../lib/util/FilenameFormatter'
import { LogLevel } from '../loggers/Logger'
import Chat from './Chat'
import Video from './Video'

export default class Config {
  // chat のフィルタリング
  chatFilters: ChatFilterConfigInterface[]

  // 結合ファイル名
  mergeImageFileName: string

  // 画像を保管する
  complementImage: boolean

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

  // ファイル名フォーマット
  public formatFilename(video: Video, chats: Chat[]) {
    return FilenameFormatter.format(this.mergeImageFileName, video, chats)
  }
}
