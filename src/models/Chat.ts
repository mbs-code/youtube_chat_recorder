import { ellipsis } from '../lib/util/format'
import { type Plain, toDate, toTime } from '../lib/util/serialize'

const DATE_KEYS = ['timestamp', 'createdAt', 'updatedAt'] as const

export default class Chat {
  id?: string // ChwKGkNP...

  authorName?: string
  authorPhoto?: string // url
  message?: string
  altMessage?: string // 画像要素 (絵文字など) を展開した文

  isOwner = false
  isModerator = false
  isMember = false
  isVerified = false

  memberMonths?: number // undefined, 0(新規), 1, 2, ...

  isJoinMember = false // メンバー加入
  isMilestone = false // メンバー歴 (マイルストーン) チャット
  milestoneText?: string // "メンバー歴 11 か月"
  isSuperChat = false
  isSuperStickers = false
  money?: number
  moneyUnit?: string // 通貨単位

  pngUrl?: string // チャット欄の画像 (data url)
  isImageError = false // 画像生成エラー

  seconds?: number // 配信開始からの経過秒
  timestamp?: Date // 投稿日時 (配信中は分単位の精度)

  createdAt?: Date
  updatedAt?: Date

  /** storage から復元する. */
  public static fromPlain(plain: Plain): Chat {
    const chat = Object.assign(new Chat(), plain)
    for (const key of DATE_KEYS) chat[key] = toDate(plain[key])
    return chat
  }

  /** storage に保存する形にする. */
  public toPlain(): Plain {
    const plain: Plain = Object.fromEntries(Object.entries(this))
    for (const key of DATE_KEYS) plain[key] = toTime(this[key])
    return plain
  }

  public dump(): string {
    const emojis = []
    if (this.isOwner) emojis.push('🟨')
    if (this.isModerator) emojis.push('🔧')
    if (this.isMember) emojis.push('🟩')
    if (this.isVerified) emojis.push('✅')
    if (this.isJoinMember) emojis.push('🌟')
    if (this.isMilestone) emojis.push('🎉')
    if (this.money) emojis.push('💰')

    const date = this.timestamp?.toLocaleString()
    const author = this.authorName || '<unknown>'
    const message = this.altMessage || '<notext>'
    const money = this.money ? ` (${this.moneyUnit} ${this.money})` : ''
    return `${date}(${this.seconds}) ${emojis.join('')}[${ellipsis(author, 16)}]${ellipsis(message, 24)}${money}`
  }
}
