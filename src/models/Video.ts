import { ellipsis } from '../lib/util/format'
import { type Plain, toDate, toTime } from '../lib/util/serialize'

const DATE_KEYS = ['startDate', 'endDate', 'publishedAt', 'createdAt', 'updatedAt'] as const

export type VideoType = 'video' | 'upcoming' | 'live' | 'archive'

export default class Video {
  id?: string // 動画 ID (11 文字)

  title?: string
  channelName?: string
  thumbnailUrl?: string
  duration = 0 // 秒数, 配信中は 0
  viewCount = 0

  isBroadcast = false // ライブ配信 (チャットがある) かどうか
  isLiveNow = false // 現在配信中か
  isUpcoming = false // 配信予定か

  startDate?: Date // 配信 (予定) 開始時刻
  endDate?: Date // 配信終了時刻
  publishedAt?: Date

  createdAt?: Date
  updatedAt?: Date

  get type(): VideoType {
    if (!this.isBroadcast && !this.startDate) return 'video'
    if (this.isUpcoming) return 'upcoming'
    if (this.isLiveNow || !this.endDate) return 'live'
    return 'archive'
  }

  get url(): string | undefined {
    return this.id ? `https://www.youtube.com/watch?v=${this.id}` : undefined
  }

  /** storage から復元する. */
  public static fromPlain(plain: Plain): Video {
    const fields = { ...plain }
    delete fields.type // getter のみのプロパティは代入できないので除外
    delete fields.url
    const video = Object.assign(new Video(), fields)
    for (const key of DATE_KEYS) video[key] = toDate(plain[key])
    return video
  }

  /** storage に保存する形にする. (getter は含まれない) */
  public toPlain(): Plain {
    const plain: Plain = Object.fromEntries(Object.entries(this))
    for (const key of DATE_KEYS) plain[key] = toTime(this[key])
    return plain
  }

  public dump(): string {
    return `[${this.id}]${ellipsis(this.title || '<notitle>', 24)}`
  }
}
