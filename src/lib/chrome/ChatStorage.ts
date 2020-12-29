import { classToPlain, plainToClass } from 'class-transformer'
import { browser } from 'webextension-polyfill-ts'
import Chat from '../../models/Chat'
export default class ChatStorage {
  // chat のキーは 動画ID

  public static async get(videoId: string): Promise<Chat[]> {
    const value = await browser.storage.local.get(videoId)
    const plains: any[] | undefined = value[videoId]

    // デシリアライズする
    if (plains) {
      const chats = plains.map(plain => plainToClass(Chat, plain))
      return chats
    }
    return []
  }

  protected static async replace(videoId: string, chats: Chat[]): Promise<void> {
    // シリアライズする
    const plains = chats ? chats.map(e => classToPlain(e)) : null
    await browser.storage.local.set({ [videoId]: plains })
  }

  public static async save(videoId: string, chats: Chat[]): Promise<void> {
    const dbs = await this.get(videoId)
    const count = dbs.length

    // 各チャットを挿入していく
    let duplicate = 0
    for (const chat of chats) {
      // 配列中に存在するなら消しとく
      const index = dbs.findIndex(c => c.id === chat.id)
      if (index >= 0) {
        duplicate++
        const del = dbs.splice(index, 1)[0]
        chat.createdAt = del.createdAt
      }

      // 更新日時の付与
      chat.createdAt = chat.createdAt || new Date()
      chat.updatedAt = new Date()

      // 末尾に追加しとく (軽さ重視でソートは見るときに)
      dbs.push(chat)
    }

    // 値の置き換え
    console.log(`💾[save] chats: ${dbs.length} (db:${count}, +add:${chats.length}, -dup:${duplicate})`)
    await this.replace(videoId, dbs)
  }

  public static async remove(videoId: string): Promise<Chat[] | undefined> {
    const videos = await this.get(videoId)

    // 値があったら消しとく
    if (videos) {
      console.log(`💾[remove] chats: ${videoId}`)
      await browser.storage.local.remove(videoId)
    }
    return videos
  }
}
