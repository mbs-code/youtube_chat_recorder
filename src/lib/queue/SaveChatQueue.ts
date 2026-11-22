import BadgeManager from '../../content-scripts/BadgeManager'
import Logger from '../../loggers/Logger'
import type Chat from '../../models/Chat'
import type Video from '../../models/Video'
import ChatStorage from '../chrome/storage/ChatStorage'
import BaseQueue from './BaseQueue'

/** チャットを storage に保存するキュー. */
export default class SaveChatQueue extends BaseQueue<Chat> {
  protected video?: Video

  public setVideo(video: Video): void {
    this.reset()
    this.video = video
  }

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
