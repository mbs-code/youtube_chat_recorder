import { describe, expect, it } from 'vitest'
import ChatParser from '../src/lib/parser/ChatParser'
import Video from '../src/models/Video'
import {
  createElement,
  MEMBERSHIP_ITEM,
  MEMBERSHIP_MILESTONE,
  PAID_MESSAGE,
  TEXT_MESSAGE_MEMBER,
  TEXT_MESSAGE_OWNER,
  TEXT_MESSAGE_TOPCHAT,
} from './fixtures/chat'

function liveVideo(): Video {
  const video = new Video()
  video.id = 'live0000000'
  video.isBroadcast = true
  video.isLiveNow = true
  video.startDate = new Date(2026, 10, 22, 8, 0, 0)
  return video
}

function archiveVideo(): Video {
  const video = new Video()
  video.id = 'archive0000'
  video.isBroadcast = true
  video.startDate = new Date(2026, 10, 16, 18, 0, 0)
  video.endDate = new Date(2026, 10, 16, 20, 0, 0)
  return video
}

describe('ChatParser.parse', () => {
  it('通常チャット (メンバー) を解析できる', async () => {
    const now = new Date(2026, 10, 22, 9, 50, 30)
    const chat = await ChatParser.parse(liveVideo(), createElement(TEXT_MESSAGE_MEMBER), now)

    expect(chat.id).toBe('ChwKGkNPZkg4T0d0bXBnREZlN001d01kQks4RG1B')
    expect(chat.authorName).toBe('@Azulあずる')
    expect(chat.authorPhoto).toContain('yt4.ggpht.com')
    expect(chat.message).toBe('片手で握りつぶされそうw link')
    expect(chat.altMessage).toBe('片手で握りつぶされそう:animeWaiting:😂w link')
    expect(chat.isMember).toBe(true)
    expect(chat.memberMonths).toBe(12)
    expect(chat.isOwner).toBe(false)
    // 9:50 AM で現在時刻 (9:50:30) に近いので現在時刻が使われる
    expect(chat.timestamp).toEqual(now)
    expect(chat.seconds).toBe(110 * 60 + 30)
  })

  it('チャンネル所有者 + 確認済みバッジ (アーカイブ) を解析できる', async () => {
    const video = archiveVideo()
    const chat = await ChatParser.parse(video, createElement(TEXT_MESSAGE_OWNER))

    expect(chat.authorName).toBe('@hololive')
    expect(chat.isOwner).toBe(true)
    expect(chat.isVerified).toBe(true)
    expect(chat.seconds).toBe(-(8 * 60 + 47))
    expect(chat.timestamp).toEqual(new Date(video.startDate!.getTime() - (8 * 60 + 47) * 1000))
  })

  it('スーパーチャットを解析できる', async () => {
    const chat = await ChatParser.parse(liveVideo(), createElement(PAID_MESSAGE), new Date(2026, 10, 22, 22, 5))

    expect(chat.authorName).toBe('@superfan')
    expect(chat.isSuperChat).toBe(true)
    expect(chat.money).toBe(10000)
    expect(chat.moneyUnit).toBe('￥')
    expect(chat.message).toBe('おめでとう！')
    expect(chat.timestamp).toEqual(new Date(2026, 10, 22, 22, 1))
  })

  it('メンバー加入を解析できる', async () => {
    const chat = await ChatParser.parse(archiveVideo(), createElement(MEMBERSHIP_ITEM))

    expect(chat.authorName).toBe('@Dawn_Raider')
    expect(chat.isJoinMember).toBe(true)
    expect(chat.isMember).toBe(true)
    expect(chat.memberMonths).toBe(0)
    expect(chat.altMessage).toBe('ホロライブ応援デラックス へようこそ！')
    expect(chat.isMilestone).toBe(false)
    expect(chat.seconds).toBe(-(1 * 3600 + 14 * 60 + 32))
  })

  it('メンバー歴 (マイルストーン) を解析できる', async () => {
    const now = new Date(2026, 10, 22, 10, 26, 40)
    const chat = await ChatParser.parse(liveVideo(), createElement(MEMBERSHIP_MILESTONE), now)

    expect(chat.authorName).toBe('@一文字紅牙')
    expect(chat.isMilestone).toBe(true)
    expect(chat.isJoinMember).toBe(false)
    expect(chat.isMember).toBe(true)
    expect(chat.memberMonths).toBe(11) // バッジ (6 か月) よりヘッダーを優先
    expect(chat.milestoneText).toBe('メンバー歴 11 か月')
    expect(chat.message).toBe('「この世の全て⇒世界平和」ですね、分かります。')
    expect(chat.altMessage).toBe('「この世の全て⇒世界平和」ですね、分かります。')
    expect(chat.timestamp).toEqual(now)
  })

  it('トップチャットの順位を解析できる', async () => {
    const chat = await ChatParser.parse(liveVideo(), createElement(TEXT_MESSAGE_TOPCHAT))

    expect(chat.topChatRank).toBe(1)
    expect(chat.authorName).toBe('@ひろスペh1122')
    expect(chat.message).toBe('たくさん徳を積みます')
    expect(chat.isMember).toBe(true)
    expect(chat.memberMonths).toBe(2)
  })

  it('順位ボタンが無ければトップチャットではない', async () => {
    const chat = await ChatParser.parse(liveVideo(), createElement(TEXT_MESSAGE_MEMBER))
    expect(chat.topChatRank).toBeUndefined()
  })

  it('メンバー歴 (本文なし) はヘッダーを本文にする', async () => {
    const node = createElement(MEMBERSHIP_MILESTONE)
    node.querySelector('#message')!.textContent = ''
    const chat = await ChatParser.parse(liveVideo(), node)

    expect(chat.isMilestone).toBe(true)
    expect(chat.altMessage).toBe('メンバー歴 11 か月')
  })
})

describe('ChatParser.parseTimestamp', () => {
  const now = new Date(2026, 10, 22, 0, 10, 0) // 0:10 AM

  it('配信中: AM/PM 表記 (日付またぎ)', () => {
    const { datetime } = ChatParser.parseTimestamp('11:58\u202fPM', liveVideo(), now)
    expect(datetime).toEqual(new Date(2026, 10, 21, 23, 58))
  })

  it('配信中: 12:05 AM は 0:05', () => {
    const { datetime } = ChatParser.parseTimestamp('12:05 AM', liveVideo(), now)
    expect(datetime).toEqual(new Date(2026, 10, 22, 0, 5))
  })

  it('配信中: 午前/午後 表記', () => {
    const { datetime } = ChatParser.parseTimestamp('午後 11:30', liveVideo(), now)
    expect(datetime).toEqual(new Date(2026, 10, 21, 23, 30))
  })

  it('配信中: 24 時間表記', () => {
    const { datetime } = ChatParser.parseTimestamp('23:59', liveVideo(), now)
    expect(datetime).toEqual(new Date(2026, 10, 21, 23, 59))
  })

  it('アーカイブ: 経過時間', () => {
    const video = archiveVideo()
    expect(ChatParser.parseTimestamp('1:23:45', video).seconds).toBe(5025)
    expect(ChatParser.parseTimestamp('12:34', video).seconds).toBe(754)
    expect(ChatParser.parseTimestamp('-0:05', video).seconds).toBe(-5)
  })

  it('解析できない値', () => {
    expect(ChatParser.parseTimestamp(undefined, liveVideo())).toEqual({})
    expect(ChatParser.parseTimestamp('foo', liveVideo())).toEqual({})
  })
})

describe('ChatParser.parseMemberMonth', () => {
  it.each([
    ['新規メンバー', 0],
    ['New member', 0],
    ['メンバー（10 か月）', 10],
    ['メンバー（1 年）', 12],
    ['メンバー（1 年 2 か月）', 14],
    ['Member (2 years)', 24],
    ['Member (6 months)', 6],
    [undefined, undefined],
  ])('%s -> %s', (label, expected) => {
    expect(ChatParser.parseMemberMonth(label)).toBe(expected)
  })
})

describe('ChatParser.parsePurchaseAmount', () => {
  it.each([
    ['￥1,000', 1000, '￥'],
    ['￥10,000,000', 10000000, '￥'],
    ['$50.00', 50, '$'],
    ['NT$75.00', 75, 'NT$'],
    ['€5,00', 5, '€'],
    ['1,500 円', 1500, '円'],
  ])('%s', (text, money, unit) => {
    expect(ChatParser.parsePurchaseAmount(text)).toEqual({ money, unit })
  })

  it('数字が無ければ undefined', () => {
    expect(ChatParser.parsePurchaseAmount('free')).toBeUndefined()
  })
})
