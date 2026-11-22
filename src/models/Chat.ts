import { ellipsis } from '../lib/util/format'
import { type Plain, toDate, toTime } from '../lib/util/serialize'

/** 日時のフィールド (storage には epoch msec で保存する). */
const DATE_KEYS = ['timestamp', 'createdAt', 'updatedAt'] as const

/**
 * チャット 1 件 (動画 ID を key にして配列で保存する).
 *
 * - YouTube のチャット欄の要素から ChatParser で作る.
 * - フィールドを増やす時は初期値を付ける (古い保存データには無いため).
 */
export default class Chat {
  id?: string // YouTube のチャット ID (ChwKGkNP...). 同じチャットの重複保存の判定に使う

  authorName?: string // 投稿者名 (@handle)
  authorPhoto?: string // アイコンの url
  message?: string // 本文 (絵文字の画像は含まない. フィルターの判定に使う)
  altMessage?: string // 画像要素 (絵文字など) を展開した文

  // 投稿者の種類
  isOwner = false // 配信者 (チャンネルの所有者)
  isModerator = false // モデレーター
  isMember = false // チャンネルメンバー
  isVerified = false // 確認済みチャンネル (✅)

  memberMonths?: number // メンバー歴の月数. undefined, 0(新規), 1, 2, ...

  // チャットの種類
  isJoinMember = false // メンバー加入
  isMilestone = false // メンバー歴 (マイルストーン) チャット
  milestoneText?: string // "メンバー歴 11 か月"
  topChatRank?: number // トップチャットの順位 (👑#1 なら 1)

  // スーパーチャット
  isSuperChat = false
  isSuperStickers = false
  money?: number // 金額
  moneyUnit?: string // 通貨単位

  pngUrl?: string // チャット欄の画像 (data url)
  isImageError = false // 画像生成エラー

  seconds?: number // 配信開始からの経過秒
  timestamp?: Date // 投稿日時 (配信中は分単位の精度)

  createdAt?: Date // 初めて保存した日時
  updatedAt?: Date // 最後に保存した日時

  /**
   * 投稿時間の早い順に並べるための比較関数. (`chats.sort(Chat.compareByTime)`)
   *
   * - 配信開始からの経過秒で比べ、無ければ投稿日時で比べる.
   */
  public static compareByTime(a: Chat, b: Chat): number {
    if (a.seconds !== undefined && b.seconds !== undefined) return a.seconds - b.seconds
    return (a.timestamp?.getTime() ?? 0) - (b.timestamp?.getTime() ?? 0)
  }

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

  /** ログ用の短い文字列. */
  public dump(): string {
    const emojis = []
    if (this.isOwner) emojis.push('🟨')
    if (this.isModerator) emojis.push('🔧')
    if (this.isMember) emojis.push('🟩')
    if (this.isVerified) emojis.push('✅')
    if (this.isJoinMember) emojis.push('🌟')
    if (this.isMilestone) emojis.push('🎉')
    if (this.topChatRank) emojis.push(`👑${this.topChatRank}`)
    if (this.money) emojis.push('💰')

    const date = this.timestamp?.toLocaleString()
    const author = this.authorName || '<unknown>'
    const message = this.altMessage || '<notext>'
    const money = this.money ? ` (${this.moneyUnit} ${this.money})` : ''
    return `${date}(${this.seconds}) ${emojis.join('')}[${ellipsis(author, 16)}]${ellipsis(message, 24)}${money}`
  }
}
