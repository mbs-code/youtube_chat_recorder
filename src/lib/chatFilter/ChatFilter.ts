import type Chat from '../../models/Chat'
import type { ChatFilterConfigInterface, ChatFilterDataInterface, ChatTaskType } from './ChatFilterInterface'

/**
 * 基本フィルター (チャットの種類).
 *
 * - 'all' は popup の絞り込み専用 (設定には出さない).
 * - 追加した場合、既存ユーザーの設定には complementChatFilterConfigs で補完される.
 */
const BASE_FILTERS: ChatFilterDataInterface[] = [
  {
    key: 'all',
    title: 'すべて表示',
    func: () => true,
  },
  {
    key: 'plain',
    title: '⬜ 通常チャット',
    func: (chat: Chat) => {
      return (
        !chat.isOwner
        && !chat.isVerified
        && !chat.isModerator
        && !chat.isSuperChat
        && !chat.isSuperStickers
        && !chat.isMember
        && !chat.isJoinMember
        && !chat.isMilestone
        && !chat.isGift
        && chat.topChatRank === undefined
      )
    },
  },
  {
    key: 'owner',
    title: '🟨 チャンネルの所有者',
    func: (chat: Chat) => chat.isOwner,
  },
  {
    key: 'verified',
    title: '✅ 確認済み(登録10万)',
    func: (chat: Chat) => chat.isVerified,
  },
  {
    key: 'moderator',
    title: '🔧 モデレーター',
    func: (chat: Chat) => chat.isModerator,
  },
  {
    key: 'superchat',
    title: '💰 スーパーチャット',
    func: (chat: Chat) => chat.isSuperChat || chat.isSuperStickers,
  },
  {
    key: 'member',
    title: '🟩 メンバー',
    func: (chat: Chat) => chat.isMember,
  },
  {
    key: 'joinmember',
    title: '➕ メンバー加入',
    func: (chat: Chat) => chat.isJoinMember,
  },
  {
    key: 'milestone',
    title: '🎉 メンバー歴',
    func: (chat: Chat) => chat.isMilestone,
  },
  {
    key: 'gift',
    title: '🎁 メンバーシップギフト',
    func: (chat: Chat) => chat.isGift,
  },
  {
    key: 'topchat',
    title: '👑 トップチャット(順位あり)',
    func: (chat: Chat) => chat.topChatRank !== undefined,
  },
]

/**
 * 後から追加したフィルターが、既存の設定に無い場合の初期値の引き継ぎ元.
 * (milestone は v2.0.0 まで joinmember、topchat は plain として扱っていた.
 *  gift は v2.0.0 まで保存できなかったので、メンバー関連の joinmember に合わせる)
 */
const INHERIT_FILTER_KEYS: Record<string, string> = {
  milestone: 'joinmember',
  topchat: 'plain',
  gift: 'joinmember',
}

// 警告を出すフィルターキー
export const warnFilterKeys = ['plain', 'member']

// 初期設定で保存するフィルターキー
export const defaultTrueKeys = ['owner', 'verified', 'moderator']

/**
 * チャットフィルター.
 *
 * - 設定 (保存する / 画像化する) から判定関数を作り、チャットをどう処理するか決める.
 * - 画像化するフィルターに 1 つでも当てはまれば 'image'、保存するだけなら 'save'.
 */
export default class ChatFilter {
  /** 判定に使うフィルター (処理しないものは除外済み、画像化するものが先). */
  protected chatFilters: ChatFilterDataInterface[]

  constructor() {
    this.chatFilters = []
  }

  /**
   * ポップアップで使用するためのチャットフィルターを取得する.
   *
   * @static
   * @return {ChatFilterDataInterface[]} chat filter 配列
   */
  public static generatePopupChatFilters(): ChatFilterDataInterface[] {
    return BASE_FILTERS.map((cf) => {
      return {
        key: cf.key,
        title: cf.title,
        func: cf.func,
      }
    })
  }

  /**
   * 設定初期値のチャットフィルターを取得する.
   *
   * @static
   * @return {ChatFilterConfigInterface[]} config chat filter 配列
   */
  public static generateDefaultChatfilterConfigs(): ChatFilterConfigInterface[] {
    return BASE_FILTERS.filter(e => e.key !== 'all') // 全ての条件を除外する
      .map((e) => {
        return {
          key: e.key,
          title: e.title,
          doSave: defaultTrueKeys.includes(e.key),
          doImage: defaultTrueKeys.includes(e.key),
        }
      })
  }

  /**
   * 保存済みの設定に、後から追加された基本フィルターを補完する.
   *
   * - 追加分は基本フィルターの並び順の位置に挿入する.
   * - 初期値は INHERIT_FILTER_KEYS の引き継ぎ元があればその値、無ければ初期設定.
   *
   * @param configs 保存済みの config chat filter 配列
   */
  public static complementChatFilterConfigs(configs: ChatFilterConfigInterface[]): ChatFilterConfigInterface[] {
    const result = [...configs]
    const defaults = this.generateDefaultChatfilterConfigs()

    defaults.forEach((def, index) => {
      if (result.some(cf => cf.key === def.key)) return

      const inherit = result.find(cf => cf.key === INHERIT_FILTER_KEYS[def.key])
      const filter = inherit ? { ...def, doSave: inherit.doSave, doImage: inherit.doImage } : def

      // 直前の基本フィルターの後ろに入れる (見つからなければ先頭側)
      const prevKeys = defaults.slice(0, index).map(d => d.key)
      const insertAt = result.reduce((at, cf, i) => (prevKeys.includes(cf.key) ? i + 1 : at), 0)
      result.splice(insertAt, 0, filter)
    })

    return result
  }

  ///

  /**
   * チャットフィルターを設定する.
   *
   * @param {ChatFilterConfigInterface[]} configs config chat filter 配列
   */
  public setChatFilters(configs: ChatFilterConfigInterface[]): void {
    // 生成して設定する
    const chatFilters = this.generateChatFilters(configs)

    // 処理チェックが無いフィルターを除外する
    const actives = chatFilters.filter(cf => cf.doImage || cf.doSave)

    // doImage = true を上部にソートする (image が見つかれば即決定できるため)
    this.chatFilters = actives.sort((a, b) => Number(Boolean(b.doImage)) - Number(Boolean(a.doImage)))
  }

  /**
   * チャットが引っかかるフィルターを取得する.
   *
   * @param {Chat} chat 対象の chat
   * @return {{ filter: ChatFilterDataInterface, taskType: ChatTaskType } | undefined} 引っかかったフィルター
   */
  public checkStuckChatFilter(chat: Chat): { filter: ChatFilterDataInterface, taskType: ChatTaskType } | undefined {
    // 先頭から全部見ていく
    // もし image があったら即決定
    // save は最後まで image 要素が出てこなかったらで
    let isSaveFilter: ChatFilterDataInterface | null = null

    const chatFilters = this.chatFilters
    for (const cf of chatFilters) {
      if (!cf.func) continue

      // フラグが無かったらそもそもスキップする
      // ※ (!isSave) は一度 true になったら条件を飛ばす
      if ((!isSaveFilter && cf.doSave) || cf.doImage) {
        const isTarget = cf.func(chat)
        if (isTarget) {
          if (cf.doImage) {
            return { filter: cf, taskType: 'image' }
          } else {
            isSaveFilter = cf
          }
        }
      }
    }

    // もし isSave が入ってたら
    if (isSaveFilter) return { filter: isSaveFilter, taskType: 'save' }
    return undefined
  }

  /**
   * チャットの処理方法を取得する.
   *
   * @param {Chat} chat 対象の chat
   * @return {ChatTaskType} 引っかかった処理方法
   */
  public checkChatTaskType(chat: Chat): ChatTaskType {
    const scf = this.checkStuckChatFilter(chat)
    return scf?.taskType || false
  }

  ///

  /** 設定から判定関数付きのフィルターを作る (判定関数が作れないものは除外). */
  protected generateChatFilters(configs: ChatFilterConfigInterface[]): ChatFilterDataInterface[] {
    return configs
      .map((config) => {
        // 関数はモードがあれば自己生成、無ければ検索
        const func = config.textMode
          ? this.generateChatFilterFunc(config)
          : BASE_FILTERS.find(bf => bf.key === config.key)?.func || undefined // 無いかもしれない

        return {
          key: config.key,
          title: config.title,
          doSave: config.doSave,
          doImage: config.doImage,
          func: func, // nullable
        }
      })
      .filter(cf => cf.func !== undefined) // 未定義を削除する
  }

  /** テキストマッチングのフィルターの判定関数を作る (本文 / 投稿者名 × 部分一致 / 完全一致 / 正規表現). */
  protected generateChatFilterFunc(cf: ChatFilterConfigInterface): ((chat: Chat) => boolean) | undefined {
    // モードがあるなら自己生成する
    const mode = cf.textMode
    const match = cf.match
    if (mode && match) {
      const isRegex = cf.isRegex
      const isExact = cf.isExact

      const pick = mode === 'author' ? (chat: Chat) => chat.authorName || '' : (chat: Chat) => chat.message || ''

      if (isRegex) {
        let regex: RegExp
        try {
          regex = new RegExp(match)
        } catch {
          return undefined // 不正な正規表現は無視する
        }
        return (chat: Chat) => regex.test(pick(chat))
      }
      if (isExact) return (chat: Chat) => pick(chat) === match
      return (chat: Chat) => pick(chat).includes(match)
    }
    return undefined
  }
}
