import { describe, expect, it } from 'vitest'
import ChatFilter from '../src/lib/chatFilter/ChatFilter'
import type { ChatFilterConfigInterface } from '../src/lib/chatFilter/ChatFilterInterface'
import FilenameFormatter from '../src/lib/util/FilenameFormatter'
import { ellipsis, formatByte, hmsString, hmsToSeconds } from '../src/lib/util/format'
import Chat from '../src/models/Chat'
import Config from '../src/models/Config'
import Video from '../src/models/Video'

describe('storage との相互変換 (v1 の保存形式と互換)', () => {
  it('Chat: 日時は epoch msec で保存される', () => {
    // v1 (class-transformer) で保存されていた形式
    const legacy = { id: 'abc', authorName: 'name', isOwner: true, seconds: 12, timestamp: 1700000000000, createdAt: 1700000001000 }
    const chat = Chat.fromPlain(legacy)

    expect(chat).toBeInstanceOf(Chat)
    expect(chat.timestamp).toEqual(new Date(1700000000000))
    expect(chat.isMember).toBe(false) // 初期値が入る
    expect(chat.dump()).toContain('name')

    const plain = chat.toPlain()
    expect(plain.timestamp).toBe(1700000000000)
    expect(plain.updatedAt).toBeUndefined()
    expect(Chat.fromPlain(plain)).toEqual(chat)
  })

  it('Video: getter (type, url) は保存されず、復元時も無視される', () => {
    const video = Video.fromPlain({ id: 'dQw4w9WgXcQ', startDate: 1700000000000, type: 'live', url: 'x' })
    expect(video.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')

    const plain = video.toPlain()
    expect(plain).not.toHaveProperty('type')
    expect(plain).not.toHaveProperty('url')
    expect(plain.startDate).toBe(1700000000000)
  })

  it('Config: 足りない値は初期値になる', () => {
    const config = Config.fromPlain({ runScript: false, updatedAt: 1700000000000 })
    expect(config.runScript).toBe(false)
    expect(config.maxVideoLength).toBe(20)
    expect(config.chatFilters.length).toBeGreaterThan(0)
    expect(config.updatedAt).toEqual(new Date(1700000000000))
    expect(config.toPlain().updatedAt).toBe(1700000000000)
  })
})

describe('後から追加した基本フィルターの補完', () => {
  // v2.0.0 までの保存済み設定 (milestone が無い)
  const legacy: ChatFilterConfigInterface[] = [
    { key: 'plain', title: '⬜ 通常チャット', doSave: false, doImage: false },
    { key: 'joinmember', title: '➕ メンバー加入', doSave: true, doImage: true },
    { key: '1700000000000', title: 'custom', doSave: true, doImage: false, textMode: 'message', match: 'x' },
  ]

  it('joinmember の設定を引き継いで、基本フィルターの並びに挿入する', () => {
    const config = Config.fromPlain({ chatFilters: legacy })
    const keys = config.chatFilters.map(cf => cf.key)

    expect(keys.indexOf('milestone')).toBe(keys.indexOf('joinmember') + 1)
    expect(keys.at(-1)).toBe('1700000000000') // カスタムフィルターは末尾のまま
    expect(config.chatFilters.find(cf => cf.key === 'milestone')).toMatchObject({ doSave: true, doImage: true })
    expect(config.chatFilters.find(cf => cf.key === 'owner')).toMatchObject({ doSave: true, doImage: true }) // 初期値
    expect(config.chatFilters.find(cf => cf.key === 'topchat')).toMatchObject({ doSave: false, doImage: false }) // plain を引き継ぐ
  })

  it('既にあるものは変更しない', () => {
    const configs = ChatFilter.generateDefaultChatfilterConfigs()
    expect(ChatFilter.complementChatFilterConfigs(configs)).toEqual(configs)
  })

  it('マイルストーンは通常チャット・メンバー加入に一致しない', () => {
    const cf = new ChatFilter()
    cf.setChatFilters([
      { key: 'plain', title: '', doSave: true, doImage: false },
      { key: 'joinmember', title: '', doSave: true, doImage: false },
    ])
    expect(cf.checkChatTaskType(Object.assign(new Chat(), { isMilestone: true }))).toBe(false)
    expect(cf.checkChatTaskType(Object.assign(new Chat(), { topChatRank: 3 }))).toBe(false)
  })
})

describe('ChatFilter', () => {
  const chat = (props: Partial<Chat>) => Object.assign(new Chat(), props)
  const filter = (configs: ChatFilterConfigInterface[]) => {
    const cf = new ChatFilter()
    cf.setChatFilters(configs)
    return cf
  }

  it('画像化が保存より優先される', () => {
    const cf = filter([
      { key: 'member', title: 'member', doSave: true, doImage: false },
      { key: 'owner', title: 'owner', doSave: true, doImage: true },
    ])
    expect(cf.checkChatTaskType(chat({ isOwner: true, isMember: true }))).toBe('image')
    expect(cf.checkChatTaskType(chat({ isMember: true }))).toBe('save')
    expect(cf.checkChatTaskType(chat({}))).toBe(false)
  })

  it('テキストマッチング (部分一致 / 完全一致 / 正規表現)', () => {
    const cf = filter([
      { key: '1', title: 'a', doSave: true, doImage: false, textMode: 'message', match: 'こん' },
      { key: '2', title: 'b', doSave: true, doImage: true, textMode: 'author', match: '@exact', isExact: true },
      { key: '3', title: 'c', doSave: true, doImage: true, textMode: 'message', match: '^草+$', isRegex: true },
    ])
    expect(cf.checkChatTaskType(chat({ message: 'こんにちは' }))).toBe('save')
    expect(cf.checkChatTaskType(chat({ authorName: '@exact' }))).toBe('image')
    expect(cf.checkChatTaskType(chat({ authorName: '@exact2' }))).toBe(false)
    expect(cf.checkChatTaskType(chat({ message: '草草草' }))).toBe('image')
    expect(cf.checkChatTaskType(chat({ message: '草w' }))).toBe(false)
  })

  it('不正な正規表現は無視される', () => {
    const cf = filter([{ key: '1', title: 'bad', doSave: true, doImage: false, textMode: 'message', match: '(', isRegex: true }])
    expect(cf.checkChatTaskType(chat({ message: '(' }))).toBe(false)
  })
})

describe('FilenameFormatter', () => {
  it('置換と禁則文字のエスケープ', () => {
    const video = Object.assign(new Video(), { id: 'dQw4w9WgXcQ', title: 'a/b:c', publishedAt: new Date(2020, 0, 2, 3, 4, 5) })
    const chats = [new Chat(), new Chat()]
    expect(FilenameFormatter.format('%title%_%id%_%count%', video, chats)).toBe('abc_dQw4w9WgXcQ_2')
    expect(FilenameFormatter.format('%upload(yyyyMMdd)%', video, chats)).toBe('20200102')
    expect(FilenameFormatter.format('%unknown%', video, chats)).toBe('error')
  })
})

describe('format', () => {
  it('hmsString', () => {
    expect(hmsString(0)).toBe('00:00')
    expect(hmsString(65)).toBe('01:05')
    expect(hmsString(3725)).toBe('1:02:05')
    expect(hmsString(-5)).toBe('-00:05')
    expect(hmsString(undefined)).toBe('-')
  })

  it('hmsToSeconds', () => {
    expect(hmsToSeconds('1:02:05')).toBe(3725)
    expect(hmsToSeconds('-0:05')).toBe(-5)
  })

  it('formatByte', () => {
    expect(formatByte(0)).toBe('0 B')
    expect(formatByte(42500)).toBe('42.5 kB')
    expect(formatByte(1_234_567)).toBe('1.2 MB')
  })

  it('ellipsis はサロゲートペアを壊さない', () => {
    expect(ellipsis('😀😀😀', 2)).toBe('😀😀...')
    expect(ellipsis('abc', 5)).toBe('abc')
  })
})
