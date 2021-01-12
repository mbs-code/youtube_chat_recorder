import Logger from '../../../loggers/Logger'
import Chat from '../../../models/Chat'
import BaseStorage from './BaseStorage'

export default class ChatStorage extends BaseStorage{
  // chat のキーは 動画ID

  /**
   * 特定の動画のチャットを取り出す.
   *
   * @static
   * @param {string} videoId 動画の ID
   * @return {Chat[]} chat object array
   */
  public static async get(videoId: string): Promise<Chat[]> {
    const chats = await this.getClassObjectArray(Chat, videoId)
    return chats
  }

  /**
   * チャットを上書き保存する.
   *
   * - サイズ制限は無いので注意
   * @static
   * @param {string} videoId 動画の ID
   * @param {Chat[]} chats chat object array
   */
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
      chat.updatedAt = new Date()
      chat.createdAt = chat.createdAt || chat.updatedAt

      // 末尾に追加しとく (軽さ重視でソートは見るときに)
      dbs.push(chat)
    }

    // 値の置き換え
    Logger.debug(`> 💾[save] chats: ${dbs.length} (db:${count}, +add:${chats.length}, -dup:${duplicate})`)
    await this.replaceObject(videoId, dbs)
  }

  /**
   * 特定の動画のチャットを指定して削除する.
   *
   * @static
   * @param {string} videoId 動画の ID
   * @param {Chat[]} chats chat object array
   * @return {Chat[]} 削除した chats
   */
  public static async remove(videoId: string, chats: Chat[]): Promise<Chat[]> {
    const dbs = await this.get(videoId)

    const dels = []
    for (const chat of chats) {
      // 配列中に存在するなら消しとく
      const index = dbs.findIndex(c => c.id === chat.id)
      if (index >= 0) {
        const del = dbs.splice(index, 1)[0]
        if (del.id) {
          Logger.debug(`> 💾[remove] chat: ${videoId} - ${del.id}`)
          dels.push(del)
        }
      }
    }

    // 値の置き換え
    if (dels.length > 0) {
      await this.replaceObject(videoId, dbs)
    }

    return dels
  }

  /**
   * チャット情報を空にする.
   *
   * @static
   * @return {boolean} 削除できたか(false で失敗、存在しない)
   */
  public static async clear(videoId: string): Promise<boolean> {
    return await this.removeKey(videoId)
  }
}
