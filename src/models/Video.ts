import { Exclude } from 'class-transformer'
import 'reflect-metadata'
import textEllipsis from 'text-ellipsis'
import VideoObjectInterface from '../interface/VideoObjectInterface'
import TransformDate from '../lib/decorator/TransformDate'
import VideoParser from '../lib/parser/VideoParser'

export default class Video {
  id?: string // 76KDBk...

  title?: string
  thumbnailUrl?: string
  // description?: string // 容量削減
  duration = 0 // seconds 配信中は 0
  viewCount = 0
  isBroadcast: boolean // 配信かどうか

  @TransformDate()
  startDate?: Date // 配信予定開始か実開始時間

  @TransformDate()
  endDate?: Date // 配信終了時間

  @TransformDate()
  publishedAt?: Date

  @TransformDate()
  createdAt?: Date // 作成日時

  @TransformDate()
  updatedAt?: Date // 更新日時

  constructor() {
    // 初期値
    this.isBroadcast = false
  }

  public static async createByElement(json: VideoObjectInterface): Promise<Video> {
    return await VideoParser.parse(json)
  }

  @Exclude()
  get type(): 'video' | 'live' | 'archive' {
    // TODO: 現状 upcomig が分からない
    if (this.startDate) {
      if (this.endDate) {
        return 'archive'
      } else {
        return 'live'
      }
    }
    return 'video'
  }

  @Exclude()
  get url(): string | undefined {
    return this.id ? `https://www.youtube.com/watch?v=${this.id}` : undefined
  }

  public dump(): string {
    const title = this.title || '<notitle>'
    return `[${this.id}]${textEllipsis(title, 24)}`
  }
}
