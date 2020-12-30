import { addSeconds, differenceInSeconds, subDays } from 'date-fns'
import parseDatetime from 'date-fns/parse'
import Chat from '../../models/Chat'
import Video from '../../models/Video'
import DomQueryHelper from '../util/DomQueryHelper'
import Util from '../util/Util'
import retry from '../util/Retry'

export default class ChatParser {
  public static async parse(video: Video, node: Element): Promise<Chat> {
    const chat = new Chat()
    chat.id = node.getAttribute('id') || undefined

    // 時刻 ///
    const timestamp = DomQueryHelper.getTextContent(node, '#timestamp')
    if (timestamp) {
      const times = this.parseTimestamp(timestamp, video)
      chat.timestamp = times.datetime
      chat.seconds = times.seconds
    }

    // 投稿者 ///
    chat.authorName = await retry(() => DomQueryHelper.getTextContent(node, '#author-name')) // 稀に時間がかかる
    chat.authorPhoto = DomQueryHelper.getAttribute(node, '#author-photo #img', 'src')

    // 本文 ///
    const msgs = node.querySelector('#message')?.childNodes
    chat.message = this.generateMessage(msgs)
    chat.altMessage = this.generateMessage(msgs, true)

    // 属性 ///
    // const authorType = DomQueryHelper.getAttribute(node, null, 'author-type') // owner, moderator, member
    const authorIsOwner = DomQueryHelper.hasAttribute(node, null, 'author-is-owner')
    if (authorIsOwner) chat.isOwner = true

    const chipBadges = Array.from(node.querySelectorAll('#chip-badges yt-live-chat-author-badge-renderer'))
    for (const chipBadge of chipBadges) {
      const type = DomQueryHelper.getAttribute(chipBadge, null, 'type') // verified   // TODO: チャンネル主以外の verified は未確認
      if (type === 'verified') chat.isVerified = true
    }

    const authorBadges = Array.from(node.querySelectorAll('#chat-badges yt-live-chat-author-badge-renderer'))
    for (const authorBadge of authorBadges) {
      const type = DomQueryHelper.getAttribute(authorBadge, null, 'type') // member   // TODO: moderator は未確認
      if (type === 'member') {
        chat.isMember = true
        const areaLabel = DomQueryHelper.getAttribute(authorBadge, null, 'aria-label') // メッセージを取っておく
        chat.memberMonths = this.parseMemberMonth(areaLabel)
      }
    }

    // スーパーチャット系 ///
    const purchaseAmount = DomQueryHelper.getTextContent(node, '#purchase-amount')
    if (purchaseAmount) {
      const split = this.parsePurchaseAmount(purchaseAmount)
      chat.isSuperChat = true
      chat.money = split?.money
      chat.moneyUnit = split?.unit
    }

    // スーパーステッカー系 ///
    const purchaseAmountChip = DomQueryHelper.getTextContent(node, '#purchase-amount-chip')
    if (purchaseAmountChip) {
      const split = this.parsePurchaseAmount(purchaseAmountChip)
      chat.isSuperStickers = true
      chat.money = split?.money
      chat.moneyUnit = split?.unit
      chat.altMessage = await retry(() => DomQueryHelper.getAttribute(node, '#sticker #img', 'alt'))
    }

    // メンバー加入系 ///
    if (node.tagName.toLowerCase() === 'yt-live-chat-membership-item-renderer') {
      // これが最適解
      const headerSubtext = DomQueryHelper.getTextContent(node, '#header-subtext')
      chat.altMessage = headerSubtext
      chat.isJoinMember = true
    }

    return chat
  }

  /// ////////////////////////////////////////////////////////////

  protected static generateMessage(messageChildNodes?: NodeListOf<ChildNode>, includeAltText = false): string | undefined {
    if (messageChildNodes) {
      let message = ''

      for (const child of Array.from(messageChildNodes)) {
        const type = child.nodeType
        if (type === Node.ELEMENT_NODE) {
          if (includeAltText) {
            const element = child as Element // cast
            const tagName = element.tagName.toLowerCase()
            if (tagName === 'a') {
              message += element.textContent || ''
            } else {
              message += element.attributes.getNamedItem('alt')?.textContent || ''
            }
          }
        } else if (type === Node.TEXT_NODE) {
          message += child.textContent
        }
      }

      return message
    }
    return undefined
  }

  protected static parseTimestamp(timestamp?: string, video?: Video): { datetime?: Date; seconds?: number } {
    // "hh:mm AM"（予約, 配信中とメンバー加入時）, [-]h:m:ss（アーカイブ）
    if (timestamp) {
      const startDate = video ? video.startDate : undefined // nullable
      const timeStr = timestamp.toLowerCase()

      // hh:mm [AM|PM] パターン (現在時刻で補完する)
      if (timeStr.includes('am') || timeStr.includes('pm')) {
        // str から時刻を推定する
        let chatDate = parseDatetime(timeStr, 'hh:mm a', new Date())

        // 文字列が pm のとき、現在時刻が am なら一日引く (日付またぎ処理)
        // TODO: youtube が 12時間以上動作しない前提
        if (timeStr.includes('pm') && chatDate.getHours() < 12) {
          chatDate = subDays(chatDate, 1)
        }

        // もし、現在時刻との差分が一定以下だったら現在時刻を使用 (自環境で66くらいが max)
        if (differenceInSeconds(new Date(), chatDate) < 90) {
          chatDate = new Date()
        }

        const sec = startDate ? differenceInSeconds(chatDate, startDate) : undefined
        return { datetime: chatDate, seconds: sec }
      }

      // [-]h:m:ss パターン (上より正確, 基本的にアーカイブのみ)
      if (timeStr.indexOf(':') && startDate) {
        // 時刻から秒数を算出して、開始時刻から引く
        const sec = Util.hmsToSeconds(timeStr)
        const date = addSeconds(startDate, sec)
        return { datetime: date, seconds: sec }
      }
    }

    return {}
  }

  protected static parseMemberMonth(areaLabel?: string): number | undefined {
    // "新規メンバー", "（10 か月）", "（1 年 2 か月）"
    if (areaLabel) {
      if (areaLabel.includes('新規' || areaLabel.includes('new'))) {
        return 0 // 0ヶ月目
      }

      const hasYear = areaLabel.includes('年') || areaLabel.includes('year')
      const nums = areaLabel.match(/\d+/g) // 数字のみ
      if (nums) {
        if (hasYear) {
          return parseInt(nums[0]) * 12 + parseInt(nums[1] || '0')
        } else {
          return parseInt(nums[0])
        }
      }
    }
    return undefined
  }

  protected static parsePurchaseAmount(purchaseAmount?: string): { money: number; unit: string } | undefined {
    // "￥1,000", "$50.00", "NT$75.00"
    if (purchaseAmount) {
      // 空白とカンマを除去
      const text = purchaseAmount
        .replace(' ', '')
        .replace(',', '')
        .trim()

      const moneys = text.match(/-?[0-9]+\.?[0-9]*/g) || [] // 数字だけ抽出
      const money = Number(moneys[0])
      const unit = text.replace(moneys[0], '').trim() // 数字以外を取り出す
      return { money, unit }
    }
    return undefined
  }
}
