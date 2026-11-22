import { format as dateFormat } from 'date-fns'
import Chat from '../../models/Chat'
import type Video from '../../models/Video'
import { hmsString } from './format'

type Cell = string | number | boolean | undefined

interface Column {
  header: string
  value: (chat: Chat, video: Video) => Cell
}

/** CSV の列. 並び順がそのまま出力される. */
const COLUMNS: Column[] = [
  { header: '投稿日時', value: chat => (chat.timestamp ? dateFormat(chat.timestamp, 'yyyy-MM-dd HH:mm:ss') : undefined) },
  { header: '経過時間', value: chat => (chat.seconds !== undefined ? hmsString(chat.seconds) : undefined) },
  { header: '経過秒', value: chat => chat.seconds },
  { header: '投稿者', value: chat => chat.authorName },
  { header: '本文', value: chat => chat.altMessage },
  { header: '配信者', value: chat => chat.isOwner },
  { header: 'モデレーター', value: chat => chat.isModerator },
  { header: '確認済み', value: chat => chat.isVerified },
  { header: 'メンバー', value: chat => chat.isMember },
  { header: 'メンバー歴(月)', value: chat => chat.memberMonths },
  { header: 'メンバー加入', value: chat => chat.isJoinMember },
  { header: 'メンバー歴チャット', value: chat => chat.isMilestone },
  { header: 'メンバーシップギフト', value: chat => chat.isGift },
  { header: 'ギフト数', value: chat => chat.giftCount },
  { header: 'ギフト(星など)', value: chat => chat.giftItem },
  { header: 'トップチャット順位', value: chat => chat.topChatRank },
  { header: 'スパチャへの返信先', value: chat => chat.replyTo },
  { header: 'スーパーチャット', value: chat => chat.isSuperChat || chat.isSuperStickers },
  { header: '金額', value: chat => chat.money },
  { header: '通貨', value: chat => chat.moneyUnit },
  { header: 'Super の回数', value: chat => chat.superCount },
  { header: '動画ID', value: (_, video) => video.id },
  { header: '動画タイトル', value: (_, video) => video.title },
  { header: 'チャットID', value: chat => chat.id },
]

/** 表計算ソフトで数式として解釈される先頭文字 (CSV インジェクション対策). */
const FORMULA_PREFIX = /^[=+\-@\t\r]/

function escapeCell(cell: Cell): string {
  if (cell === undefined || cell === null) return ''
  if (typeof cell === 'boolean') return cell ? '1' : ''
  if (typeof cell === 'number') return Number.isFinite(cell) ? String(cell) : ''

  let text = cell
  if (FORMULA_PREFIX.test(text)) text = '\'' + text
  return /[",\r\n]/.test(text) || text !== cell ? `"${text.replace(/"/g, '""')}"` : text
}

/** Excel で UTF-8 として開かれるように先頭に付ける BOM. */
const BOM = String.fromCharCode(0xfeff)

/** 1 つの動画とそのチャット. */
export interface VideoChats {
  video: Video
  chats: Chat[]
}

export default class ChatCsv {
  /**
   * 1 つの動画のチャットを CSV 文字列にする.
   *
   * - Excel で文字化けしないよう先頭に BOM を付け、改行は CRLF にする.
   * - 投稿時間の早い順に並べる.
   */
  public static generate(video: Video, chats: Chat[]): string {
    return this.generateMany([{ video, chats }])
  }

  /**
   * 複数の動画のチャットを 1 つの CSV 文字列にする.
   *
   * - 動画は渡された順、各動画の中は投稿時間の早い順に並べる.
   */
  public static generateMany(groups: VideoChats[]): string {
    const lines = [COLUMNS.map(c => escapeCell(c.header))]
    for (const { video, chats } of groups) {
      for (const chat of [...chats].sort(Chat.compareByTime)) {
        lines.push(COLUMNS.map(c => escapeCell(c.value(chat, video))))
      }
    }
    return BOM + lines.map(cells => cells.join(',')).join('\r\n') + '\r\n'
  }

  /** ダウンロード用の object url を作る. (使い終わったら URL.revokeObjectURL すること) */
  public static createObjectURL(video: Video, chats: Chat[]): string {
    return this.toObjectURL(this.generate(video, chats))
  }

  /** 複数の動画のチャットをまとめた CSV の object url を作る. */
  public static createManyObjectURL(groups: VideoChats[]): string {
    return this.toObjectURL(this.generateMany(groups))
  }

  protected static toObjectURL(csv: string): string {
    return URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  }
}
