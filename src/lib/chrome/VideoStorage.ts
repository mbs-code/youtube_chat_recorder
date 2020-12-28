import arraySort from 'array-sort'
import { browser } from 'webextension-polyfill-ts'
import Video from '../../models/Video'

export default class VideoStorage {
  public static readonly STORAGE_KEY = '@videos'
  public static MAX_LENGTH = 10

  public static async getAll(): Promise<Video[]> {
    const value = await browser.storage.local.get(this.STORAGE_KEY)
    const partialVideos: Partial<Video>[] | undefined = value[this.STORAGE_KEY]

    if (partialVideos) {
      // model にマッピングする
      const videos = partialVideos.map(partial => new Video(partial))
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

  public static async replace(videos: Video[]): Promise<void> {
    // 値の置き換え
    await browser.storage.local.set({ [this.STORAGE_KEY]: videos })
  }

  public static async save(video: Video): Promise<void> {
    const videos = await this.getAll()

    // 配列中に存在するなら消しとく
    const index = videos.findIndex(v => v.id === video.id)
    if (index >= 0) {
      const del = videos.splice(index, 1)[0]
      video.createdAt = del.createdAt
    }

    // 更新日時の付与
    video.createdAt = video.createdAt || new Date()
    video.updatedAt = new Date()

    // 閲覧時間の降順で追加 (とりあえず先頭)
    videos.unshift(video)

    // 更新日時ソートからの個数制限
    const sortVideos = arraySort(videos, 'updatedAt')
    const splitVideos = sortVideos.slice(0, this.MAX_LENGTH)

    // 値の置き換え
    await this.replace(splitVideos)
  }

  public static async clear(): Promise<void> {
    await browser.storage.local.remove(this.STORAGE_KEY)
  }
}
