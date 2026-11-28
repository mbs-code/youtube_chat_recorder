import PinRuleMatcher, { type PinRule } from '../../util/PinRule'
import Logger from '../../../loggers/Logger'
import Video from '../../../models/Video'
import BaseStorage from './BaseStorage'
import ChatStorage from './ChatStorage'
import TimelineStorage from './TimelineStorage'

export default class VideoStorage extends BaseStorage {
  public static readonly STORAGE_KEY = '@videos'

  /**
   * 動画を全て取り出す (閲覧日時の降順).
   */
  public static async getAll(): Promise<Video[]> {
    return await this.getObjectArray(Video.fromPlain, this.STORAGE_KEY)
  }

  /**
   * 特定の動画を取り出す.
   */
  public static async get(videoId: string): Promise<Video | undefined> {
    const videos = await this.getAll()
    return videos.find(v => v.id === videoId)
  }

  /**
   * 動画を保存する.
   *
   * - 閲覧日時の降順で保存する.
   * - maxLength を超えた古い動画は、そのチャットごと削除する.
   *   自動で削除しない動画 (isProtected) は数えず、削除もしない.
   * @param video video object
   * - 初めて保存する動画が pinRules のどれかに当てはまれば、自動で削除しない動画にする.
   *   (2 回目以降は引き継ぐだけ. ユーザーがピン止めを外したら戻さない)
   * @param maxLength 最大保存数
   * @param pinRules 自動でピン止めする条件
   */
  public static async save(video: Video, maxLength: number, pinRules: PinRule[] = []): Promise<void> {
    const dbs = await this.getAll()
    const oldLength = dbs.length

    // 既にあるなら作成日時と最大値 (同接・再生数) を引き継いで置き換える
    const index = dbs.findIndex(v => v.id === video.id)
    const prev = index >= 0 ? dbs.splice(index, 1)[0] : undefined
    if (prev) {
      video.createdAt = prev.createdAt
      video.isProtected = prev.isProtected
    } else if (PinRuleMatcher.matches(pinRules, video)) {
      video.isProtected = true
    }
    video.mergeMaxStats(prev)

    video.updatedAt = new Date()
    video.createdAt = video.createdAt || video.updatedAt
    dbs.unshift(video)

    // 更新日時の降順で個数制限する
    dbs.sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0))
    const limits: Video[] = []
    const overflows: Video[] = []
    let count = 0
    for (const v of dbs) {
      if (v.isProtected) limits.push(v)
      else if (count++ < Math.max(1, maxLength)) limits.push(v)
      else overflows.push(v)
    }

    const stat = `db:${oldLength}, +add:1, -dup:${Number(index >= 0)}, -del:${overflows.length}`
    Logger.debug(`> 💾[save] videos: ${limits.length} (${stat})`)
    await this.replaceObject(this.STORAGE_KEY, limits)

    // 溢れた動画のチャットも消しておく
    for (const overflow of overflows) {
      if (!overflow.id) continue
      await ChatStorage.clear(overflow.id)
      await TimelineStorage.clear(overflow.id)
    }
  }

  /**
   * 同時接続数が最大を超えていれば保存する. (一覧の並び順 = updatedAt は変えない)
   *
   * @return 更新した video (超えていない・動画が無いなら undefined)
   */
  public static async updateMaxViewers(videoId: string, viewers: number): Promise<Video | undefined> {
    const dbs = await this.getAll()
    const video = dbs.find(v => v.id === videoId)
    if (!video?.updateMaxViewers(viewers)) return undefined

    Logger.debug(`> 💾[save] max viewers: ${viewers} (${videoId})`)
    await this.replaceObject(this.STORAGE_KEY, dbs)
    return video
  }

  /**
   * 最大保存数を超えても自動で削除しないかを切り替える.
   *
   * @return 更新した video (動画が無いなら undefined)
   */
  public static async setProtected(videoId: string, isProtected: boolean): Promise<Video | undefined> {
    const dbs = await this.getAll()
    const video = dbs.find(v => v.id === videoId)
    if (!video) return undefined

    video.isProtected = isProtected
    Logger.debug(`> 💾[save] protected: ${isProtected} (${videoId})`)
    await this.replaceObject(this.STORAGE_KEY, dbs)
    return video
  }

  /**
   * 特定の動画を (チャットごと) 削除する.
   *
   * @return 削除した video
   */
  public static async remove(video: Video): Promise<Video | undefined> {
    const dbs = await this.getAll()

    const index = dbs.findIndex(v => v.id === video.id)
    if (index < 0) return undefined

    const [del] = dbs.splice(index, 1)
    Logger.debug(`> 💾[remove] video: ${del.id}`)
    await this.replaceObject(this.STORAGE_KEY, dbs)
    if (del.id) {
      await ChatStorage.clear(del.id)
      await TimelineStorage.clear(del.id)
    }

    return del
  }

  /**
   * 動画情報を空にする.
   */
  public static async clear(): Promise<boolean> {
    return await this.removeKey(this.STORAGE_KEY)
  }
}
