import Chat from '../../models/Chat'
import Video from '../../models/Video'
import ChatStorage from '../chrome/ChatStorage'
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
    const vid = this.video?.id
    if (vid) {
      await ChatStorage.save(vid, chats)
    }
  }
}
