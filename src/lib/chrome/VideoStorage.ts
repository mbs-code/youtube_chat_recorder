import arraySort from 'array-sort'
import { compareDesc } from 'date-fns'
import { classToPlain, plainToClass } from 'class-transformer'
import { browser } from 'webextension-polyfill-ts'
import Video from '../../models/Video'
import ChatStorage from './ChatStorage'

export default class VideoStorage {
  public static readonly STORAGE_KEY = '@videos'
  public static MAX_LENGTH = 10

  public static async getAll(): Promise<Video[]> {
    const value = await browser.storage.local.get(this.STORAGE_KEY)
    const plains: any[] | undefined = value[this.STORAGE_KEY]

    // デシリアライズする
    if (plains) {
      const videos = plains.map(plain => plainToClass(Video, plain))
      return videos
    }
    return []
  }

  public static async get(videoId: string): Promise<Video | undefined> {
    const videos = await this.getAll()

    // 検索は先頭一致
    const video = videos.find(v => v.id === videoId)
    return video
  }

  protected static async replace(videos: Video[] | undefined): Promise<void> {
    // シリアライズする
    const plains = videos ? videos.map(e => classToPlain(e)) : null
    await browser.storage.local.set({ [this.STORAGE_KEY]: plains })
  }

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
    video.createdAt = video.createdAt || new Date()
    video.updatedAt = new Date()

    // 閲覧時間の降順で追加 (とりあえず先頭)
    dbs.unshift(video)

    // 更新日時ソートからの個数制限 (削除があるのでソートを厳格に)
    const sorts = arraySort(dbs, (a: Video, b: Video) => {
      return compareDesc(a.updatedAt || 0, b.updatedAt || 0) // 降順の最低値 0
    })

    // 破壊的に先頭から取り出す
    const limits = sorts.splice(0, this.MAX_LENGTH)

    // 値の置き換え
    console.log(`💾[save] videos: ${limits.length} (db:${oldLength}, +add:1, -dup:${Number(index >= 0)})`)
    await this.replace(limits)

    // video を消したら chat も消しとく
    // TODO: 設定次第！
    if (sorts.length) {
      for (const sort of sorts) {
        if (sort.id) await ChatStorage.remove(sort.id)
      }
    }
  }

  public static async remove(video: Video): Promise<Video | undefined> {
    const videos = await this.getAll()

    // 配列中に存在するなら消しとく
    const index = videos.findIndex(v => v.id === video.id)
    if (index >= 0) {
      const del = videos.splice(index, 1)[0]

      if (del.id) {
        // 値の置き換え
        console.log(`💾[remove] video: ${del.id}`)
        await this.replace(videos)

        // video を消したら chat も消しとく
        // TODO: 設定次第！
        await ChatStorage.remove(del.id)
      }
      return del
    }

    return undefined
  }

  public static async clear(): Promise<void> {
    await browser.storage.local.remove(this.STORAGE_KEY)
  }
}
