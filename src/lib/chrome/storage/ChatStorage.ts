import Logger from '../../../loggers/Logger'
import Chat from '../../../models/Chat'
import BaseStorage from './BaseStorage'

/** チャットの保存先. key は動画 ID. */
export default class ChatStorage extends BaseStorage {
  /**
   * 特定の動画のチャットを取り出す.
   *
   * @param videoId 動画の ID
   */
  public static async get(videoId: string): Promise<Chat[]> {
    return await this.getObjectArray(Chat.fromPlain, videoId)
  }

  /**
   * チャットを追加 (同じ ID なら置き換え) 保存する.
   *
   * - サイズ制限は無いので注意
   * @param videoId 動画の ID
   * @param chats chat object array
   */
  public static async save(videoId: string, chats: Chat[]): Promise<void> {
    const dbs = await this.get(videoId)
    const count = dbs.length
    const indexById = new Map(dbs.map((c, i) => [c.id, i]))

    let duplicate = 0
    const now = new Date()
    for (const chat of chats) {
      chat.updatedAt = now

      const index = chat.id !== undefined ? indexById.get(chat.id) : undefined
      if (index !== undefined) {
        // 既にあるなら作成日時と画像を引き継いで置き換える
        duplicate++
        const old = dbs[index]
        chat.createdAt = old.createdAt || now
        if (!chat.pngUrl && old.pngUrl) {
          chat.pngUrl = old.pngUrl
          chat.isImageError = false
        }
        dbs[index] = chat
      } else {
        // 末尾に追加しとく (軽さ重視でソートは見るときに)
        chat.createdAt = chat.createdAt || now
        indexById.set(chat.id, dbs.length)
        dbs.push(chat)
      }
    }

    Logger.debug(`> 💾[save] chats: ${dbs.length} (db:${count}, +add:${chats.length}, -dup:${duplicate})`)
    await this.replaceObject(videoId, dbs)
  }

  /**
   * 特定の動画のチャットを指定して削除する.
   *
   * @param videoId 動画の ID
   * @param chats 削除する chat
   * @return 削除した chats
   */
  public static async remove(videoId: string, chats: Chat[]): Promise<Chat[]> {
    const ids = new Set(chats.map(c => c.id))
    const dbs = await this.get(videoId)

    const dels = dbs.filter(c => ids.has(c.id))
    if (dels.length > 0) {
      Logger.debug(`> 💾[remove] chats: ${videoId} - ${dels.length}`)
      const remains = dbs.filter(c => !ids.has(c.id))
      await this.replaceObject(videoId, remains)
    }
    return dels
  }

  /**
   * 特定の動画のチャットを空にする.
   *
   * @return 削除できたか (false なら存在しない)
   */
  public static async clear(videoId: string): Promise<boolean> {
    return await this.removeKey(videoId)
  }
}
