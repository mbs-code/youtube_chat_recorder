import FilenameFormatter from '../lib/util/FilenameFormatter'
import Chat from './Chat'
import Video from './Video'

export default class Config {
  // 結合ファイル名
  mergeImageFileName: string

  // 最大保存video数
  maxVideoLength: number

  constructor() {
    this.mergeImageFileName = '%now%'
    this.maxVideoLength = 10
  }

  // ファイル名フォーマット
  public formatFilename(video: Video, chats: Chat[]) {
    return FilenameFormatter.format(this.mergeImageFileName, video, chats)
  }
}
