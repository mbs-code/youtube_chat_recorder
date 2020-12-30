import Chat from '../models/Chat'

export interface ChatFilterInterface {
  key: string
  title: string
  func: (chats: Chat[]) => Chat[]
}

const chatFilters: ChatFilterInterface[] = [
  {
    key: 'all',
    title: 'すべて表示',
    func: (chats: Chat[]) => chats,
  },
  {
    key: 'owner',
    title: '🟨 チャンネルの所有者',
    func: (chats: Chat[]) => chats.filter(c => c.isOwner),
  },
  {
    key: 'verified',
    title: '✅ 確認済み(登録10万)',
    func: (chats: Chat[]) => chats.filter(c => c.isVerified),
  },
  {
    key: 'moderator',
    title: '🔧 モデレーター',
    func: (chats: Chat[]) => chats.filter(c => c.isModerator),
  },
  {
    key: 'superchat',
    title: '💰 スーパーチャット',
    func: (chats: Chat[]) => chats.filter(c => c.isSuperChat || c.isSuperStickers),
  },
  {
    key: 'member',
    title: '🟩 メンバー',
    func: (chats: Chat[]) => chats.filter(c => c.isMember),
  },
  {
    key: 'joinmember',
    title: '➕ メンバー加入',
    func: (chats: Chat[]) => chats.filter(c => c.isJoinMember),
  },
]

export default chatFilters
