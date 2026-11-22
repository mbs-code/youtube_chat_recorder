import BadgeManager from '../../content-scripts/BadgeManager'
import Logger from '../../loggers/Logger'
import type Chat from '../../models/Chat'
import type Video from '../../models/Video'
import ChatStorage from '../chrome/storage/ChatStorage'
import BaseQueue from './BaseQueue'

/**
 * チャットを storage に保存するキュー.
 *
 * - 保存したらタブのバッジ (取得数) を増やす.
 * - 動画が設定されていない間に来たチャットは捨てる.
 */
export default class SaveChatQueue extends BaseQueue<Chat> {
  /** 保存先の動画. */
  protected video?: Video

  /** 保存先の動画を切り替える. (前の動画のチャットが残っていれば捨てる) */
  public setVideo(video: Video): void {
    this.reset()
    this.video = video
  }

  /** 保存先の動画を外す. (以降のチャットは保存しない) */
  public removeVideo(): void {
    this.video = undefined
  }

  protected async invoke(chats: Chat[]): Promise<void> {
    const videoId = this.video?.id
    if (!videoId) return

    Logger.debug(`💾[SAVE] saving... (item: ${chats.length})`)
    try {
      await ChatStorage.save(videoId, chats)
      Logger.debug(`💾[SAVE] done`)
      await BadgeManager.addBadgeCounter(chats.length)
    } catch (err) {
      Logger.error(err)
    }
  }
}
