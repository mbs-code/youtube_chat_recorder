import ChatFilters, { ChatConfigFilterInterface } from '../configs/ChatFilters'
import TransformDate from '../lib/decorator/TransformDate'
import FilenameFormatter from '../lib/util/FilenameFormatter'
import Chat from './Chat'
import Video from './Video'

export default class Config {
  // chat のフィルタリング
  chatFilters: ChatConfigFilterInterface[]

  // 結合ファイル名
  mergeImageFileName: string

  // 最大保存video数
  maxVideoLength: number

  @TransformDate()
  createdAt?: Date // 作成日時

  @TransformDate()
  updatedAt?: Date // 更新日時

  constructor() {
    // 初期値
    this.chatFilters = ChatFilters.generateConfigChatFilters()
    this.mergeImageFileName = '%now%'
    this.maxVideoLength = 10
  }

  // ファイル名フォーマット
  public formatFilename(video: Video, chats: Chat[]) {
    return FilenameFormatter.format(this.mergeImageFileName, video, chats)
  }

  // 処理対象のチャットかどうか
  public checkChatTask(chat: Chat): 'save' | 'image' | false {
    return ChatFilters.checkChatTask(this.chatFilters, chat)
  }
}
