import arraySort from 'array-sort'
import Chat from '../../models/Chat'
import {
  ChatFilterConfigInterface,
  ChatFilterDataInterface,
  ChatTaskType,
} from './ChatFilterInterface'

const BASE_FILTERS: ChatFilterDataInterface[] = [
  {
    key: 'all',
    title: 'すべて表示',
    func: (chat: Chat) => true,
  },
  {
    key: 'plain',
    title: '⬜ 通常チャット',
    func: (chat: Chat) => {
      return !chat.isOwner && !chat.isVerified && !chat.isModerator&& !chat.isSuperChat
        && !chat.isSuperStickers && !chat.isMember && !chat.isJoinMember
    }
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
    func: (chat: Chat) =>  chat.isSuperChat || chat.isSuperStickers,
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
]

// 警告を出すフィルターキー
export const warnFilterKeys = ['plain', 'member']

// 初期設定で保存するフィルターキー
export const defaultTrueKeys = ['owner', 'verified', 'moderator']

export default class ChatFilter {
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
    return BASE_FILTERS.map(cf => {
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
    return BASE_FILTERS
      .filter(e => e.key !== 'all') // 全ての条件を除外する
      .map(e => {
        return {
          key: e.key,
          title: e.title,
          doSave: defaultTrueKeys.includes(e.key),
          doImage: defaultTrueKeys.includes(e.key),
        }
      })
  }

  ///


  /**
   * チャットフィルターを設定する.
   *
   * @param {ChatFilterConfigInterface[]} configs config chat filter 配列
   */
  public setChatFilters(configs: ChatFilterConfigInterface[]) {
    // 生成して設定する
    const chatFilters = this.generateChatFilters(configs)

    // 処理チェックが無いフィルターを除外する
    const actives = chatFilters.filter(cf => cf.doImage || cf.doSave)

    // isImage = true を上部にソートする (最適化)
    const sorts = arraySort(actives, 'isImage')

    this.chatFilters = sorts
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
    let isSaveFilter = null

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

  protected generateChatFilters(configs: ChatFilterConfigInterface[]) {
    return configs
      .map(config => {
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

  protected generateChatFilterFunc(cf: ChatFilterConfigInterface): ((chat: Chat) => boolean) | undefined {
    // モードがあるなら自己生成する
    const mode = cf.textMode
    const match = cf.match
    if (mode && match) {
      const isRegex = cf.isRegex
      const isExact = cf.isExact

      if (mode === 'message') {
        if (isRegex) return (chat: Chat) => ((chat.message || '').match(match)?.length || -1) > 0
        if (isExact) return (chat: Chat) => (chat.message || '') === match
        return (chat: Chat) => (chat.message || '').includes(match)
      } else if (mode === 'author') {
        if (isRegex) return (chat: Chat) => ((chat.authorName || '').match(match)?.length || -1) > 0
        if (isExact) return (chat: Chat) => (chat.authorName || '') === match
        return (chat: Chat) => (chat.authorName || '').includes(match)
      }
    }
    return undefined
  }
}
