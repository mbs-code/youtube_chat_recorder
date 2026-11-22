import Logger from '../../../loggers/Logger'
import { mergeTimeline, type TimelinePoint } from '../../../models/Timeline'

/** 配信の推移 (1 分ごとの同時接続数・コメント数) の保存先. key は `@timeline:<動画ID>`. */
export default class TimelineStorage {
  /** key の先頭. */
  public static readonly KEY_PREFIX = '@timeline:'

  public static key(videoId: string): string {
    return this.KEY_PREFIX + videoId
  }

  /** 記録を取り出す (時刻の昇順). */
  public static async get(videoId: string): Promise<TimelinePoint[]> {
    const key = this.key(videoId)
    const result = await chrome.storage.local.get(key)
    const points = result[key]
    return Array.isArray(points) ? (points as TimelinePoint[]) : []
  }

  /** 記録を足して保存する. (同じ分はコメント数を合計し、同時接続数は大きい方を残す) */
  public static async add(videoId: string, points: TimelinePoint[]): Promise<void> {
    if (points.length === 0) return
    const merged = mergeTimeline(await this.get(videoId), points)
    Logger.debug(`> 💾[save] timeline: ${merged.length} (+${points.length}) (${videoId})`)
    await chrome.storage.local.set({ [this.key(videoId)]: merged })
  }

  /** 記録を消す. */
  public static async clear(videoId: string): Promise<void> {
    await chrome.storage.local.remove(this.key(videoId))
  }
}
