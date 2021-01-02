import Chat from '../../models/Chat'
import { ChatFilterConfigInterface, ChatFilterDataInterface } from './ChatFilterInterface'

const BASE_FILTERS: ChatFilterDataInterface[] = [
  {
    key: 'all',
    title: 'すべて表示',
    func: (chat: Chat) => true,
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

export default class ChatFilter {
  protected chatFilters: ChatFilterDataInterface[]

  constructor() {
    this.chatFilters = []
  }

  public static getPopupChatFilters(): ChatFilterDataInterface[] {
    return BASE_FILTERS.map(cf => {
      return {
        key: cf.key,
        title: cf.title,
        func: cf.func,
      }
    })
  }

  public static getDefaultChatfilters(): ChatFilterConfigInterface[] {
    return BASE_FILTERS
      .filter(e => e.key !== 'all') // 全ての条件を除外する
      .map(e => {
        return {
          key: e.key,
          title: e.title,
          doSave: false,
          doImage: false,
        }
      })
  }

  public setChatFilters(configs: ChatFilterConfigInterface[]) {
    // 生成して設定する
    const chatFilters = this.generateChatFilters(configs)
    this.chatFilters = chatFilters
  }

  public checkChatTaskType(chat: Chat): 'save' | 'image' | false {
    // 先頭から全部見ていく
    // もし image があったら即決定
    // save は最後まで image 要素が出てこなかったらで
    let isSave = false

    console.log('[]' + chat.dump())
    const chatFilters = this.chatFilters
    for (const cf of chatFilters) {
      if (!cf.func) continue

    // フラグが無かったらそもそもスキップする
    // ※ (!isSave) は一度 true になったら条件を飛ばす
      if ((!isSave && cf.doSave) || cf.doImage) {
        const isTarget = cf.func(chat)
        if (isTarget) {
          if (cf.doImage) {
            return 'image'
          } else {
            isSave = true
          }
        }
      }
    }

    // もし isSave が入ってたら
    if (isSave) return 'save'
    return false
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
