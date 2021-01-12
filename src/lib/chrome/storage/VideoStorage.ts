import arraySort from 'array-sort'
import { compareDesc } from 'date-fns'
import Video from '../../../models/Video'
import ChatStorage from './ChatStorage'
import Logger from '../../../loggers/Logger'
import BaseStorage from './BaseStorage'

export default class VideoStorage extends BaseStorage {
  public static readonly STORAGE_KEY = '@videos'
  public static MAX_LENGTH = 10

  /**
   * 動画を全て取り出す.
   *
   * @static
   * @return {Video[]} video object array
   */
  public static async getAll(): Promise<Video[]> {
    const videos = await this.getClassObjectArray(Video, this.STORAGE_KEY)
    return videos
  }

  /**
   * 特定の動画を取り出す.
   *
   * @static
   * @param {string} videoId video id
   * @return {Config | undefined} video object
   */
  public static async get(videoId: string): Promise<Video | undefined> {
    // 検索は先頭優先
    const videos = await this.getAll()
    const video = videos.find(v => v.id === videoId)
    return video
  }

  /**
   * 動画を上書き保存する.
   *
   * - 閲覧時間の降順で保存する.
   * - self.MAX_LENGTH の値に切り詰めます.
   * @static
   * @param {Video} video video object
   */
  public static async save(video: Video): Promise<void> {
    const dbs = await this.getAll()
    const oldLength = dbs.length

    // 配列中に存在するなら消しとく(置換)
    const index = dbs.findIndex(v => v.id === video.id)
    if (index >= 0) {
      const del = dbs.splice(index, 1)[0]
      video.createdAt = del.createdAt
    }

    // 更新日時の付与
    video.updatedAt = new Date()
    video.createdAt = video.createdAt ||　video.updatedAt

    // 閲覧時間の降順で追加 (とりあえず先頭)
    dbs.unshift(video)

    // 更新日時ソートからの個数制限 (削除があるのでソートを厳格に)
    const sorts = arraySort(dbs, (a: Video, b: Video) => {
      return compareDesc(a.updatedAt || 0, b.updatedAt || 0) // 降順の最低値 0
    })

    // 破壊的に先頭から取り出す
    const limits = sorts.splice(0, this.MAX_LENGTH)

    // 値の置き換え
    const stat = `db:${oldLength}, +add:1, -dup:${Number(index >= 0)}, -del:${sorts.length}`
    Logger.debug(`> 💾[save] videos: ${limits.length} (${stat})`)
    await this.replaceObject(this.STORAGE_KEY, limits)

    // video を消したら chat も消しとく
    // TODO: 設定次第！
    if (sorts.length) {
      for (const sort of sorts) {
        if (sort.id) await ChatStorage.clear(sort.id)
      }
    }
  }

  /**
   * 特定の動画を削除する.
   *
   * @static
   * @param {Video} video video object
   * @return {Video} 削除した video
   */
  public static async remove(video: Video): Promise<Video | undefined> {
    const dbs = await this.getAll()

    // 配列中に存在するか確認
    const index = dbs.findIndex(v => v.id === video.id)
    if (index === 0) return undefined

    // 存在するなら消しとく
    const del = dbs.splice(index, 1)[0]
    if (del.id) {
      // 値の置き換え
      Logger.debug(`> 💾[remove] video: ${del.id}`)
      await this.replaceObject(this.STORAGE_KEY, dbs)

      // video を消したら chat も消しとく
      // TODO: 設定次第！
      await ChatStorage.clear(del.id)

      return del
    }
  }

  /**
   * 動画情報を空にする.
   *
   * @static
   * @return {boolean} 削除できたか(false で失敗、存在しない)
   */
  public static async clear(): Promise<boolean> {
    return await this.removeKey(this.STORAGE_KEY)
  }
}
