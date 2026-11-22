import { addSeconds, differenceInSeconds, subDays } from 'date-fns'
import Chat from '../../models/Chat'
import type Video from '../../models/Video'
import DomQueryHelper from '../util/DomQueryHelper'
import { hmsToSeconds } from '../util/format'
import retry from '../util/Retry'

/** 処理対象のチャット要素のタグ名. */
export const CHAT_NODE_NAMES = [
  'yt-live-chat-text-message-renderer', // 通常チャット
  'yt-live-chat-paid-message-renderer', // スーパーチャット
  'yt-live-chat-membership-item-renderer', // メンバー加入・マイルストーン
  'yt-live-chat-paid-sticker-renderer', // スーパーステッカー
  // 'yt-live-chat-banner-renderer', // 固定チャット
] as const

export default class ChatParser {
  /**
   * チャット要素を Chat に変換する.
   *
   * @param video チャットの動画 (時刻の計算に使う)
   * @param node CHAT_NODE_NAMES のいずれかの要素
   * @param now 現在時刻 (テスト用)
   */
  public static async parse(video: Video, node: Element, now = new Date()): Promise<Chat> {
    const chat = new Chat()
    chat.id = node.getAttribute('id') || undefined

    // 時刻 ///
    const times = this.parseTimestamp(DomQueryHelper.getTextContent(node, '#timestamp'), video, now)
    chat.timestamp = times.datetime
    chat.seconds = times.seconds

    // 投稿者 ///
    chat.authorName = (await retry(() => DomQueryHelper.getTextContent(node, '#author-name'), 3, 300)) || undefined // 稀に描画が遅れる
    chat.authorPhoto = DomQueryHelper.getAttribute(node, '#author-photo img', 'src')

    // 本文 ///
    const messageNode = node.querySelector('#message')
    if (messageNode) {
      chat.message = this.extractText(messageNode, false)
      chat.altMessage = this.extractText(messageNode, true)
    }

    // 属性 ///
    const authorType = DomQueryHelper.getAttribute(node, null, 'author-type') // owner, moderator, member, ''
    if (authorType === 'owner' || DomQueryHelper.hasAttribute(node, null, 'author-is-owner')) chat.isOwner = true
    if (authorType === 'moderator') chat.isModerator = true
    if (authorType === 'member') chat.isMember = true

    for (const badge of Array.from(node.querySelectorAll('yt-live-chat-author-badge-renderer'))) {
      const type = DomQueryHelper.getAttribute(badge, null, 'type') // verified, moderator, member, owner
      if (type === 'owner') chat.isOwner = true
      if (type === 'verified') chat.isVerified = true
      if (type === 'moderator') chat.isModerator = true
      if (type === 'member') {
        chat.isMember = true
        chat.memberMonths = this.parseMemberMonth(DomQueryHelper.getAttribute(badge, null, 'aria-label'))
      }
    }

    const tagName = node.tagName.toLowerCase()

    // スーパーチャット ///
    const purchaseAmount = DomQueryHelper.getTextContent(node, '#purchase-amount')
    if (purchaseAmount) {
      const amount = this.parsePurchaseAmount(purchaseAmount)
      chat.isSuperChat = true
      chat.money = amount?.money
      chat.moneyUnit = amount?.unit
    }

    // スーパーステッカー ///
    const purchaseAmountChip = DomQueryHelper.getTextContent(node, '#purchase-amount-chip')
    if (purchaseAmountChip) {
      const amount = this.parsePurchaseAmount(purchaseAmountChip)
      chat.isSuperStickers = true
      chat.money = amount?.money
      chat.moneyUnit = amount?.unit

      const stickerAlt = await retry(() => DomQueryHelper.getAttribute(node, '#sticker img', 'alt'), 3, 300)
      chat.altMessage = stickerAlt || ''
    }

    // メンバー加入・マイルストーン ///
    if (tagName === 'yt-live-chat-membership-item-renderer') {
      // マイルストーン: #header-primary-text = "メンバー歴 11 か月", #header-subtext = メンバーシップ名, #message = 本文 (省略可)
      // 加入: #header-primary-text なし, #header-subtext = "〇〇 へようこそ！"
      const headerPrimaryText = DomQueryHelper.getTextContent(node, '#header-primary-text')
      const headerSubtext = DomQueryHelper.getTextContent(node, '#header-subtext')
      if (headerPrimaryText) {
        chat.isMilestone = true
        chat.memberMonths = this.parseMemberMonth(headerPrimaryText) ?? chat.memberMonths // バッジより正確
        chat.milestoneText = headerPrimaryText
      } else {
        chat.isJoinMember = true
      }

      const fallback = headerPrimaryText || headerSubtext || ''
      if (!chat.altMessage) chat.altMessage = fallback
      if (!chat.message) chat.message = fallback
    }

    return chat
  }

  /// ////////////////////////////////////////////////////////////

  /**
   * 本文の文字列を取り出す.
   *
   * @param includeAlt 絵文字などの画像を alt で展開する
   */
  public static extractText(node: Node, includeAlt: boolean): string {
    let text = ''
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent ?? ''
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as Element
        if (element.tagName.toLowerCase() === 'img') {
          if (includeAlt) text += this.formatEmojiAlt(element.getAttribute('alt'))
        } else {
          text += this.extractText(element, includeAlt)
        }
      }
    }
    return text
  }

  /** 絵文字の alt を表示用にする (カスタム絵文字は :name: 形式, Unicode 絵文字はそのまま). */
  protected static formatEmojiAlt(alt: string | null): string {
    const text = alt?.trim()
    if (!text) return ''
    if (/^:.*:$/.test(text) || /\p{Extended_Pictographic}/u.test(text)) return text
    return `:${text}:`
  }

  /**
   * チャットの時刻表示を日時と配信開始からの秒数にする.
   *
   * - 配信中: "9:50 AM" や "21:50" (現在時刻から日付を補完する)
   * - アーカイブ: "1:23:45" や "-0:05" (配信開始からの経過時間)
   */
  public static parseTimestamp(timestamp: string | undefined, video?: Video, now = new Date()): { datetime?: Date; seconds?: number } {
    if (!timestamp) return {}

    const text = timestamp.replace(/[\s\u00a0\u202f]+/g, ' ').trim()
    const startDate = video?.startDate
    const meridiem = text.match(/am|pm|午前|午後/i)?.[0].toLowerCase()
    const isLive = video ? video.type === 'live' : false

    // 時刻 (hh:mm) パターン
    const clock = text.match(/^\D*(\d{1,2}):(\d{2})\D*$/)
    if (clock && (meridiem || isLive)) {
      let hours = parseInt(clock[1], 10)
      const minutes = parseInt(clock[2], 10)
      if (meridiem) {
        hours = hours % 12
        if (meridiem === 'pm' || meridiem === '午後') hours += 12
      }

      let date = new Date(now)
      date.setHours(hours, minutes, 0, 0)

      // 未来の時刻なら日付またぎ (前日の投稿)
      if (date.getTime() - now.getTime() > 60 * 1000) {
        date = subDays(date, 1)
      }

      // 現在時刻に近いなら秒まで正確な現在時刻を使う (表示上は分単位なので)
      if (differenceInSeconds(now, date) < 90) {
        date = new Date(now)
      }

      return { datetime: date, seconds: startDate ? differenceInSeconds(date, startDate) : undefined }
    }

    // 経過時間 ([-]h:mm:ss) パターン
    if (/^-?\d+(:\d{1,2}){1,2}$/.test(text)) {
      const seconds = hmsToSeconds(text)
      return { datetime: startDate ? addSeconds(startDate, seconds) : undefined, seconds }
    }

    return {}
  }

  /**
   * メンバーバッジの aria-label からメンバー歴 (月) を取り出す.
   *
   * - "新規メンバー", "メンバー（10 か月）", "メンバー（1 年 2 か月）", "Member (2 years)"
   */
  public static parseMemberMonth(ariaLabel?: string): number | undefined {
    if (!ariaLabel) return undefined
    if (ariaLabel.includes('新規') || /new/i.test(ariaLabel)) return 0

    const years = ariaLabel.match(/(\d+)\s*(年|years?)/i)
    const months = ariaLabel.match(/(\d+)\s*(か月|ヶ月|カ月|ヵ月|months?)/i)
    if (years || months) {
      return parseInt(years?.[1] ?? '0', 10) * 12 + parseInt(months?.[1] ?? '0', 10)
    }

    const nums = ariaLabel.match(/\d+/)
    return nums ? parseInt(nums[0], 10) : undefined
  }

  /**
   * 金額表記を数値と通貨単位にする.
   *
   * - "￥1,000", "$50.00", "NT$75.00", "€5,00"
   */
  public static parsePurchaseAmount(purchaseAmount?: string): { money: number; unit: string } | undefined {
    if (!purchaseAmount) return undefined

    const text = purchaseAmount.replace(/[\s\u00a0\u202f]/g, '')
    const numberText = text.match(/\d[\d,.]*/)?.[0]
    if (!numberText) return undefined

    // 末尾が ",dd" ならヨーロッパ式の小数点とみなす
    const normalized =
      /,\d{1,2}$/.test(numberText) && !numberText.includes('.')
        ? numberText.replace(/\./g, '').replace(',', '.')
        : numberText.replace(/,/g, '')

    return { money: Number(normalized), unit: text.replace(numberText, '').trim() }
  }
}
