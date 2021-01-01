import Chat from '../models/Chat'

export interface ChatFilterInterface {
  key: string
  title: string
  func: (chat: Chat) => boolean
}

export interface ChatConfigFilterInterface {
  key: string
  title: string
  doSave: boolean
  doImage: boolean

  textMode?: 'message' | 'author' | undefined
  match?: string
  isRegex?: boolean
  isExact?: boolean
}

const BASE_FILTERS: ChatFilterInterface[] = [
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

export default class ChatFilters {
  public static generateChatFilters(): ChatFilterInterface[] {
    return BASE_FILTERS.map(e => {
      return {
        key: e.key,
        title: e.title,
        func: e.func
      }
    })
  }

  public static generateConfigChatFilters(): ChatConfigFilterInterface[] {
    return BASE_FILTERS
      .map(e => {
        return {
          key: e.key,
          title: e.title,
          doSave: false,
          doImage: false,
        }
      })
      .filter(e => e.key !== 'all')
  }

  public static checkChatTask(chatConfigFilters: ChatConfigFilterInterface[], chat: Chat): 'save' | 'image' | false {
    // 先頭から全部見ていく
    // もし image があったら即決定
    // save は最後まで image 要素が出てこなかったらで

    let isSave = false
    for (const chatFilter of chatConfigFilters) {
      // フラグが無かったらそもそもスキップする
      if ((!isSave && chatFilter.doSave) || chatFilter.doImage) {
        // フィルター関数を検索する
        const filter = BASE_FILTERS.find(e => e.key === chatFilter.key)
        if (filter) {
          // 対象か検索
          const isTarget = filter.func(chat)
          if (isTarget) {
            if (chatFilter.doImage) {
              return 'image'
            } else {
              isSave = true
            }
          }
        }
      }
    }

    // もし isSave が入ってたら
    if (isSave) return 'save'
    return false
  }
}
