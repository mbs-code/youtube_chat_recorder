import 'reflect-metadata'
import textEllipsis from 'text-ellipsis'
import TransformDate from '../lib/decorator/TransformDate'
import ChatParser from '../lib/parser/ChatParser'
import Video from './Video'

export default class Chat {
  id?: string // CjkK...

  authorName?: string
  authorPhoto?: string // url
  message?: string
  altMessage?: string // 画像要素を展開した文

  isOwner = false
  isModerator = false
  isMember = false
  isVerified = false

  memberMonths?: number // undefined, 0(0ヶ月目), 1, 2, ...

  isJoinMember = false
  isSuperChat = false
  isSuperStickers = false
  money?: number
  moneyUnit?: string // 通貨単位

  pngUrl?: string // use generatePng()
  seconds?: number // 開始からの経過秒

  @TransformDate()
  timestamp?: Date // !! 配信中は秒が取得できない(仕様)

  @TransformDate()
  createdAt?: Date // 作成日時

  @TransformDate()
  updatedAt?: Date // 更新日時

  public static async createByElement(video: Video, node: Element): Promise<Chat> {
    return await ChatParser.parse(video, node)
  }

  public dump(): string {
    const emojis = []
    if (this.isOwner) emojis.push('🟨')
    if (this.isModerator) emojis.push('🔧')
    if (this.isMember) emojis.push('🟩')
    if (this.isVerified) emojis.push('✅')
    if (this.isJoinMember) emojis.push('🌟')
    if (this.money) emojis.push('💰')

    const date = this.timestamp?.toLocaleString()
    const emoji = emojis.join('')
    const author = this.authorName || '<unknown>'
    const message = this.altMessage || '<notext>'
    const money = this.money ? ` (${this.moneyUnit} ${this.money})` : ''
    return `${date}(${this.seconds}) ${emoji}[${textEllipsis(author, 16)}]${textEllipsis(message, 24)}${money}`
  }
}
