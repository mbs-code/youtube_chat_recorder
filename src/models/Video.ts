import { ellipsis } from '../lib/util/format'
import { type Plain, toDate, toTime } from '../lib/util/serialize'

/** 日時のフィールド (storage には epoch msec で保存する). */
const DATE_KEYS = ['startDate', 'endDate', 'publishedAt', 'createdAt', 'updatedAt'] as const

/** 動画の種類. video: 普通の動画, upcoming: 配信予定, live: 配信中, archive: 配信のアーカイブ. */
export type VideoType = 'video' | 'upcoming' | 'live' | 'archive'

/**
 * 動画 (最近見た動画の一覧 @videos に保存する).
 *
 * - フィールドを増やす時は初期値を付ける (古い保存データには無いため).
 */
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

  createdAt?: Date // 初めて見た日時
  updatedAt?: Date // 最後に見た日時 (一覧の並び順・古い動画の削除に使う)

  /** 動画の種類. (保存はしない) */
  get type(): VideoType {
    if (!this.isBroadcast && !this.startDate) return 'video'
    if (this.isUpcoming) return 'upcoming'
    if (this.isLiveNow || !this.endDate) return 'live'
    return 'archive'
  }

  /** 動画ページの URL. (保存はしない) */
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

  /** ログ用の短い文字列. */
  public dump(): string {
    return `[${this.id}]${ellipsis(this.title || '<notitle>', 24)}`
  }
}
