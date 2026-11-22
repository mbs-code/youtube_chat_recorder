import { describe, expect, it } from 'vitest'
import ChatParser from '../src/lib/parser/ChatParser'
import Video from '../src/models/Video'
import {
  createElement,
  GIFT_PURCHASE,
  MEMBERSHIP_ITEM,
  MEMBERSHIP_JOIN,
  MEMBERSHIP_MILESTONE,
  PAID_MESSAGE,
  PAID_MESSAGE_SUPER_COUNT,
  TEXT_MESSAGE_MEMBER,
  TEXT_MESSAGE_OWNER,
  TEXT_MESSAGE_SUPERCHAT_REPLY,
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

  it('スーパーチャットへの返信を解析できる (トップチャットとは区別する)', async () => {
    const chat = await ChatParser.parse(archiveVideo(), createElement(TEXT_MESSAGE_SUPERCHAT_REPLY))

    expect(chat.replyTo).toBe('@gikaqi-ぎかき')
    expect(chat.topChatRank).toBeUndefined()
    expect(chat.authorName).toBe('@moku8444')
    expect(chat.message).toBe('ないすぱ！')
    expect(chat.isSuperChat).toBe(false)
    expect(chat.memberMonths).toBe(2)
    expect(chat.seconds).toBe(7)
  })

  it('トップチャットは返信ではない', async () => {
    const chat = await ChatParser.parse(liveVideo(), createElement(TEXT_MESSAGE_TOPCHAT))
    expect(chat.replyTo).toBeUndefined()
  })

  it('スーパーチャットの購入回数のおまけを解析できる (本文はおまけの文と混ざらない)', async () => {
    const chat = await ChatParser.parse(archiveVideo(), createElement(PAID_MESSAGE_SUPER_COUNT))

    expect(chat.isSuperChat).toBe(true)
    expect(chat.money).toBe(800)
    expect(chat.moneyUnit).toBe('￥')
    expect(chat.superCount).toBe(5)
    expect(chat.message).toBe('卒業おめでとう！！！')
    expect(chat.authorName).toBe('@jiro9608')
    expect(chat.replyTo).toBeUndefined()
    expect(chat.seconds).toBe(22)
  })

  it('メンバー歴: 追加直後で #header-primary-text が空でも、属性でマイルストーンと分かる', async () => {
    const node = createElement(MEMBERSHIP_MILESTONE)
    node.querySelector('#header-primary-text')!.textContent = ''
    const chat = await ChatParser.parse(liveVideo(), node)

    expect(chat.isMilestone).toBe(true)
    expect(chat.isJoinMember).toBe(false)
  })

  it('メンバー歴: 属性が無くても、#header-primary-text の文字が後から入れば待って判定する', async () => {
    const node = createElement(MEMBERSHIP_MILESTONE)
    node.removeAttribute('has-primary-header-text')
    const header = node.querySelector('#header-primary-text')!
    header.textContent = ''
    setTimeout(() => (header.textContent = 'メンバー歴 4 か月'), 100)
    const chat = await ChatParser.parse(liveVideo(), node)

    expect(chat.isMilestone).toBe(true)
    expect(chat.milestoneText).toBe('メンバー歴 4 か月')
    expect(chat.memberMonths).toBe(4)
  })

  it('メンバー加入 (実 DOM, #header-primary-text が空) はマイルストーンにしない', async () => {
    const now = new Date(2026, 10, 22, 14, 14, 30)
    const chat = await ChatParser.parse(liveVideo(), createElement(MEMBERSHIP_JOIN), now)

    expect(chat.authorName).toBe('@藍染Aizen')
    expect(chat.isJoinMember).toBe(true)
    expect(chat.isMilestone).toBe(false)
    expect(chat.milestoneText).toBeUndefined()
    expect(chat.memberMonths).toBe(0)
    expect(chat.altMessage).toBe('ろありー へようこそ！')
    expect(chat.timestamp).toEqual(now)
  })

  it('メンバーシップギフトを解析できる (時刻表示が無いので配信中は現在時刻)', async () => {
    const now = new Date(2026, 10, 22, 14, 20, 0)
    const chat = await ChatParser.parse(liveVideo(), createElement(GIFT_PURCHASE), now)

    expect(chat.id).toBe('ChwKGkNOeU5rLVRvbXBnREZTVVRyUVlkek5vN1l3')
    expect(chat.authorName).toBe('@SUGI3_san')
    expect(chat.authorPhoto).toContain('yt4.ggpht.com/gift')
    expect(chat.isGift).toBe(true)
    expect(chat.giftCount).toBe(10)
    expect(chat.isJoinMember).toBe(false)
    expect(chat.isMember).toBe(true)
    expect(chat.memberMonths).toBe(12)
    expect(chat.message).toBe('Roa Ch. 海月雲ろあ のメンバーシップ ギフトを 10 個贈りました')
    expect(chat.timestamp).toEqual(now)
    expect(chat.seconds).toBe((14 - 8) * 3600 + 20 * 60)
  })

  it('時刻表示の無いチャットはアーカイブでは時刻なし', async () => {
    const chat = await ChatParser.parse(archiveVideo(), createElement(GIFT_PURCHASE))
    expect(chat.timestamp).toBeUndefined()
    expect(chat.seconds).toBeUndefined()
  })

  it('メンバー歴 (本文なし) はヘッダーを本文にする', async () => {
    const node = createElement(MEMBERSHIP_MILESTONE)
    node.querySelector('#message')!.textContent = ''
    const chat = await ChatParser.parse(liveVideo(), node)

    expect(chat.isMilestone).toBe(true)
    expect(chat.altMessage).toBe('メンバー歴 11 か月')
  })
})

describe('ChatParser.parseSuperCount', () => {
  it('Super の購入回数を取り出す', () => {
    expect(ChatParser.parseSuperCount('ライブ配信での 5 回目の Super をお祝いしましょう')).toBe(5)
    expect(ChatParser.parseSuperCount('Celebrate your 10th Super in live streams')).toBe(10)
    expect(ChatParser.parseSuperCount('')).toBeUndefined()
  })
})

describe('ChatParser.parseGiftCount', () => {
  it('ギフトの数を取り出す (チャンネル名の数字は無視する)', () => {
    expect(ChatParser.parseGiftCount('Roa Ch. 海月雲ろあ のメンバーシップ ギフトを 10 個贈りました')).toBe(10)
    expect(ChatParser.parseGiftCount('ch2 のメンバーシップ ギフトを 1,000 個贈りました')).toBe(1000)
    expect(ChatParser.parseGiftCount('Sent 5 Channel 3 gift memberships')).toBe(5)
    expect(ChatParser.parseGiftCount('')).toBeUndefined()
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
