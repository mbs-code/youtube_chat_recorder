import textEllipsis from 'text-ellipsis'
import VideoObjectInterface from '../interface/VideoObjectInterface'
import VideoParser from '../lib/parser/VideoParser'

export default class Video {
  id?: string // 76KDBk...

  title?: string
  thumbnailUrl?: string
  // description?: string // 容量削減
  duration = 0 // seconds 配信中は 0

  viewCount = 0

  isBroadcast = false // 配信かどうか
  startDate?: Date // 配信予定開始か実開始時間
  endDate?: Date // 配信終了時間

  publishedAt?: Date

  createdAt?: Date // 作成日時
  updatedAt?: Date // 更新日時

  constructor(init?: Partial<Video>) {
    if (init) Object.assign(this, init)
  }

  public static async createByElement(json: VideoObjectInterface): Promise<Video> {
    return await VideoParser.parse(json)
  }

  public dump(): string {
    const title = this.title || '<notitle>'
    return `[${this.id}]${textEllipsis(title, 24)}`
  }
}
