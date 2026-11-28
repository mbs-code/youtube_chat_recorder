import Logger from '../../../loggers/Logger'
import { mergeTimeline, mergeViewCounts, toMinute, type TimelinePoint, type ViewCountPoint } from '../../../models/Timeline'

/** 記録する値. */
export type ViewStats = Pick<ViewCountPoint, 'views' | 'likes' | 'commentCount'>

/**
 * 配信の推移 (1 分ごとの同時接続数・コメント数) と再生数の記録の保存先.
 *
 * - key は `@timeline:<動画ID>` と `@views:<動画ID>`.
 */
export default class TimelineStorage {
  /** key の先頭. */
  public static readonly KEY_PREFIX = '@timeline:'
  public static readonly VIEWS_KEY_PREFIX = '@views:'

  public static key(videoId: string): string {
    return this.KEY_PREFIX + videoId
  }

  public static viewsKey(videoId: string): string {
    return this.VIEWS_KEY_PREFIX + videoId
  }

  /** 推移を取り出す (時刻の昇順). */
  public static async get(videoId: string): Promise<TimelinePoint[]> {
    return this.getArray<TimelinePoint>(this.key(videoId))
  }

  /** 再生数の記録を取り出す (時刻の昇順). */
  public static async getViews(videoId: string): Promise<ViewCountPoint[]> {
    return this.getArray<ViewCountPoint>(this.viewsKey(videoId))
  }

  /** 書き込みを 1 つずつ順番に行うための待ち行列. (読んで足して書く間に、別の書き込みが割り込まないように) */
  protected static queue: Promise<void> = Promise.resolve()

  /** 推移を足して保存する. (同じ分はコメント数を合計し、同時接続数は大きい方を残す) */
  public static add(videoId: string, points: TimelinePoint[]): Promise<void> {
    if (points.length === 0) return Promise.resolve()
    return this.enqueue(async () => {
      const merged = mergeTimeline(await this.get(videoId), points)
      Logger.debug(`> 💾[save] timeline: ${merged.length} (+${points.length}) (${videoId})`)
      await chrome.storage.local.set({ [this.key(videoId)]: merged })
    })
  }

  /** 再生数・高評価数・コメント数を記録する. (同じ分は項目ごとに大きい方を残す) */
  public static addViews(videoId: string, stats: ViewStats, at = new Date()): Promise<void> {
    if (!stats.views) return Promise.resolve()
    return this.enqueue(async () => {
      const point: ViewCountPoint = { t: toMinute(at), views: stats.views }
      if (stats.likes !== undefined) point.likes = stats.likes
      if (stats.commentCount !== undefined) point.commentCount = stats.commentCount
      const merged = mergeViewCounts(await this.getViews(videoId), [point])
      Logger.debug(`> 💾[save] views: ${stats.views} likes: ${stats.likes ?? '-'} comments: ${stats.commentCount ?? '-'} (${merged.length}) (${videoId})`)
      await chrome.storage.local.set({ [this.viewsKey(videoId)]: merged })
    })
  }

  /** 記録を消す. */
  public static async clear(videoId: string): Promise<void> {
    await chrome.storage.local.remove([this.key(videoId), this.viewsKey(videoId)])
  }

  protected static async getArray<T>(key: string): Promise<T[]> {
    const result = await chrome.storage.local.get(key)
    const values = result[key]
    return Array.isArray(values) ? (values as T[]) : []
  }

  protected static enqueue(fn: () => Promise<void>): Promise<void> {
    const task = this.queue.then(fn)
    this.queue = task.catch(() => {}) // 失敗しても次の書き込みは続ける
    return task
  }
}
