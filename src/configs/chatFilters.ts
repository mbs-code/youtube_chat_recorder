import Chat from '../models/Chat'

export interface ChatFilterInterface {
  key: string
  title: string
  filter: (chats: Chat[]) => Chat[]
}

export interface ChatConfigFilterInterface {
  key: string
  title: string
  doSave: boolean
  doImage: boolean
}

const BASE_FILTERS: ChatFilterInterface[] = [
  {
    key: 'all',
    title: 'すべて表示',
    filter: (chats: Chat[]) => chats,
  },
  {
    key: 'owner',
    title: '🟨 チャンネルの所有者',
    filter: (chats: Chat[]) => chats.filter(c => c.isOwner),
  },
  {
    key: 'verified',
    title: '✅ 確認済み(登録10万)',
    filter: (chats: Chat[]) => chats.filter(c => c.isVerified),
  },
  {
    key: 'moderator',
    title: '🔧 モデレーター',
    filter: (chats: Chat[]) => chats.filter(c => c.isModerator),
  },
  {
    key: 'superchat',
    title: '💰 スーパーチャット',
    filter: (chats: Chat[]) => chats.filter(c => c.isSuperChat || c.isSuperStickers),
  },
  {
    key: 'member',
    title: '🟩 メンバー',
    filter: (chats: Chat[]) => chats.filter(c => c.isMember),
  },
  {
    key: 'joinmember',
    title: '➕ メンバー加入',
    filter: (chats: Chat[]) => chats.filter(c => c.isJoinMember),
  },
]

export default class ChatFilters {
  public static generateChatFilters(): ChatFilterInterface[] {
    return BASE_FILTERS.map(e => {
      return {
        key: e.key,
        title: e.title,
        filter: e.filter
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
}
