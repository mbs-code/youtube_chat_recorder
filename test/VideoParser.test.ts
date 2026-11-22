import { describe, expect, it } from 'vitest'
import { parsePlayerResponse } from '../src/lib/parser/PlayerResponseParser'
import VideoParser from '../src/lib/parser/VideoParser'
import PageHelper from '../src/lib/util/PageHelper'
import Video from '../src/models/Video'
import { ARCHIVE_PLAYER_RESPONSE, LIVE_PLAYER_RESPONSE, VIDEO_PLAYER_RESPONSE } from './fixtures/playerResponse'

function parse(playerResponse: unknown): Video {
  const data = parsePlayerResponse(playerResponse)
  if (!data) throw new Error('parse failed')
  return VideoParser.parse(data)
}

describe('parsePlayerResponse', () => {
  it('想定外の値は undefined', () => {
    expect(parsePlayerResponse(undefined)).toBeUndefined()
    expect(parsePlayerResponse({})).toBeUndefined()
    expect(parsePlayerResponse({ videoDetails: {} })).toBeUndefined()
  })

  it('structured clone できる値だけを返す', () => {
    const data = parsePlayerResponse(LIVE_PLAYER_RESPONSE)
    expect(structuredClone(data)).toEqual(data)
  })
})

describe('VideoParser', () => {
  it('配信中', () => {
    const video = parse(LIVE_PLAYER_RESPONSE)
    expect(video.id).toBe('_X07ULFy1-w')
    expect(video.title).toBe('【朝活】よしよし＆背中を押す配信！')
    expect(video.channelName).toBe('Anime ch. 佐藤あにめ')
    expect(video.thumbnailUrl).toBe('https://i.ytimg.com/vi/_X07ULFy1-w/maxresdefault.jpg?v=1')
    expect(video.viewCount).toBe(364)
    expect(video.isBroadcast).toBe(true)
    expect(video.isLiveNow).toBe(true)
    expect(video.startDate).toEqual(new Date('2026-11-21T23:33:15Z'))
    expect(video.endDate).toBeUndefined()
    expect(video.type).toBe('live')
  })

  it('アーカイブ', () => {
    const video = parse(ARCHIVE_PLAYER_RESPONSE)
    expect(video.isBroadcast).toBe(true)
    expect(video.isLiveNow).toBe(false)
    expect(video.duration).toBe(4290)
    expect(video.endDate).toEqual(new Date('2026-11-16T11:03:08Z'))
    expect(video.type).toBe('archive')
  })

  it('通常の動画', () => {
    const video = parse(VIDEO_PLAYER_RESPONSE)
    expect(video.isBroadcast).toBe(false)
    expect(video.thumbnailUrl).toBeUndefined()
    expect(video.publishedAt).toEqual(new Date('2009-10-24T23:57:33-07:00'))
    expect(video.type).toBe('video')
  })
})

describe('VideoParser.parseConcurrentViewers', () => {
  it('「〇人が視聴中」から同時接続数を取り出す', () => {
    expect(VideoParser.parseConcurrentViewers('26,905 人が視聴中  ')).toBe(26905)
    expect(VideoParser.parseConcurrentViewers('354 watching now')).toBe(354)
    expect(VideoParser.parseConcurrentViewers('5.357 Zuschauer')).toBe(5357)
    expect(VideoParser.parseConcurrentViewers('5,357')).toBe(5357)
    expect(VideoParser.parseConcurrentViewers('123 views')).toBeUndefined()
    expect(VideoParser.parseConcurrentViewers('123,456 回視聴')).toBeUndefined()
    expect(VideoParser.parseConcurrentViewers('')).toBeUndefined()
    expect(VideoParser.parseConcurrentViewers(null)).toBeUndefined()
  })
})

describe('VideoParser.readRollingNumber', () => {
  // 実際の DOM (2026-11). margin-top の位置の文字が表示されている: -500 → 5, -20 → ",", -260 → 3, -300 → 5, -340 → 7
  const column = '<div>&nbsp;</div>' + '1234567890'.repeat(3).slice(0, 29).split('').map(c => `<div>${c}</div>`).join('') + '<div>&nbsp;</div>'
  const char = (marginTop: number, inner = column) => `<animated-rolling-character class="animatedRollingCharacterHost" style="margin-top: ${marginTop}px;">${inner}</animated-rolling-character>`
  const html = `<yt-animated-rolling-number style="height: 20px; line-height: 20px;"><span class="animatedRollingNumberDigits" dir="ltr">${[
    char(-500),
    char(-20, '<div>&nbsp;</div><div>,</div><div>&nbsp;</div>'),
    char(-260),
    char(-300),
    char(-340),
  ].join('')}</span></yt-animated-rolling-number>`

  it('margin-top の位置の文字を読む', () => {
    const host = document.createElement('div')
    host.innerHTML = html
    const text = VideoParser.readRollingNumber(host.firstElementChild!)
    expect(text).toBe('5,357')
    expect(VideoParser.parseConcurrentViewers(text)).toBe(5357)
  })

  it('文字が無ければ undefined', () => {
    const host = document.createElement('div')
    host.innerHTML = '<yt-animated-rolling-number><span class="animatedRollingNumberDigits"></span></yt-animated-rolling-number>'
    expect(VideoParser.readRollingNumber(host.firstElementChild!)).toBeUndefined()
  })
})

describe('Video の最大値 (同接・再生数)', () => {
  const t1 = new Date(2026, 10, 22, 12, 0, 0)
  const t2 = new Date(2026, 10, 22, 13, 0, 0)

  it('再生数は前回より多ければ更新し、少なければ前回の最大を引き継ぐ', () => {
    const prev = Object.assign(new Video(), { viewCount: 100 })
    prev.mergeMaxStats(undefined, t1)
    expect(prev).toMatchObject({ maxViewCount: 100, maxViewCountAt: t1 })

    const more = Object.assign(new Video(), { viewCount: 150 })
    more.mergeMaxStats(prev, t2)
    expect(more).toMatchObject({ maxViewCount: 150, maxViewCountAt: t2 })

    const less = Object.assign(new Video(), { viewCount: 90 })
    less.mergeMaxStats(more, t2)
    expect(less).toMatchObject({ maxViewCount: 150, maxViewCountAt: t2 })
  })

  it('同接は最大を超えた時だけ更新し、保存形式は epoch msec', () => {
    const video = new Video()
    expect(video.updateMaxViewers(300, t1)).toBe(true)
    expect(video.updateMaxViewers(200, t2)).toBe(false)
    expect(video).toMatchObject({ maxViewers: 300, maxViewersAt: t1 })
    expect(video.toPlain().maxViewersAt).toBe(t1.getTime())
    expect(Video.fromPlain(video.toPlain()).maxViewersAt).toEqual(t1)
  })
})

describe('PageHelper.getPageVideoId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=_X07ULFy1-w', '_X07ULFy1-w'],
    ['https://www.youtube.com/watch?v=_X07ULFy1-w&t=10s', '_X07ULFy1-w'],
    ['https://www.youtube.com/live/_X07ULFy1-w?si=abc', '_X07ULFy1-w'],
    ['https://www.youtube.com/', undefined],
    ['https://www.youtube.com/@hololive/streams', undefined],
    ['https://example.com/watch?v=_X07ULFy1-w', undefined],
    ['chrome://extensions', undefined],
  ])('%s', (url, expected) => {
    expect(PageHelper.getPageVideoId(url)).toBe(expected)
  })
})
