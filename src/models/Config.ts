import ChatFilter from '../lib/chatFilter/ChatFilter'
import type { ChatFilterConfigInterface } from '../lib/chatFilter/ChatFilterInterface'
import FilenameFormatter from '../lib/util/FilenameFormatter'
import { type Plain, toDate, toTime } from '../lib/util/serialize'
import Logger, { type LogLevel } from '../loggers/Logger'
import type Chat from './Chat'
import type Video from './Video'

export interface ConfigInterface {
  // chat のフィルタリング
  chatFilters: ChatFilterConfigInterface[]

  // 結合ファイル名
  mergeImageFileName: string

  // 初めに表示されるチャットを取得する
  captureInitialChats: boolean

  // 一度保存したら処理しない
  chatDrawOnce: boolean

  // 取得できていないチャット画像を補完する
  complementImage: boolean

  // 全てのチャット画像を独自に描画する
  generateOriginalImage: boolean

  // 最大保存video数
  maxVideoLength: number

  // チャットが無い動画を保存するか
  ignoreSimpleVideo: boolean

  // スクリプトを起動させるか
  runScript: boolean

  // ログレベル
  showLogLevel: LogLevel
}

export const MIN_VIDEO_LENGTH = 5

export default class Config implements ConfigInterface {
  chatFilters: ChatFilterConfigInterface[] = ChatFilter.generateDefaultChatfilterConfigs()
  mergeImageFileName = '%now%'
  captureInitialChats = false
  chatDrawOnce = true
  complementImage = false
  generateOriginalImage = false

  maxVideoLength = 20
  ignoreSimpleVideo = false

  runScript = true
  showLogLevel: LogLevel = 'warn'

  createdAt?: Date
  updatedAt?: Date

  /** storage から復元する (足りない値は初期値). */
  public static fromPlain(plain: Plain): Config {
    const config = Object.assign(new Config(), plain)
    if (Array.isArray(plain.chatFilters)) {
      config.chatFilters = ChatFilter.complementChatFilterConfigs(plain.chatFilters as ChatFilterConfigInterface[])
    }
    config.createdAt = toDate(plain.createdAt)
    config.updatedAt = toDate(plain.updatedAt)
    return config
  }

  /** storage に保存する形にする. */
  public toPlain(): Plain {
    return {
      ...Object.fromEntries(Object.entries(this)),
      chatFilters: this.chatFilters.map(cf => ({ ...cf })), // vue の reactive proxy を剥がす
      createdAt: toTime(this.createdAt),
      updatedAt: toTime(this.updatedAt),
    }
  }

  /** 実行環境 (ログレベルなど) に設定値を反映する. */
  public applyToRuntime(): void {
    Logger.setLevel(this.showLogLevel)
  }

  /** 結合画像のファイル名を生成する. */
  public formatFilename(video: Video, chats: Chat[]): string {
    return FilenameFormatter.format(this.mergeImageFileName, video, chats)
  }
}
