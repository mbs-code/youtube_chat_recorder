import BadgeManager from '../../content-scripts/BadgeManager'
import Logger from '../../loggers/Logger'
import Chat from '../../models/Chat'
import Video from '../../models/Video'
import ChatStorage from '../chrome/storage/ChatStorage'
import BaseQueue from './BaseQueue'

export default class SaveChatQueue extends BaseQueue<Chat> {
  protected video?: Video

  constructor(interval?: number) {
    super(interval)
    this.video = undefined
  }

  public setVideo(video: Video): void {
    this.reset()
    this.video = video
  }

  public removeVideo(): void {
    this.video = undefined
  }

  protected async invoke(chats: Chat[]): Promise<void> {
    Logger.debug(`💾[SAVE] saving... (item: ${chats.length})`)
    const vid = this.video?.id
    if (vid) {
      try {
        await ChatStorage.save(vid, chats)
      } catch (err) {
        Logger.error(err)
      }
    }

    Logger.debug(`💾[SAVE] success!`)

    // icon badge を付与する
    await BadgeManager.addBadgeCounter(chats.length)
  }
}
