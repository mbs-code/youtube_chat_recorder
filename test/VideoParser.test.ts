import { describe, expect, it } from 'vitest'
import { parseConcurrentViewers, parsePlayerResponse } from '../src/lib/parser/PlayerResponseParser'
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

describe('parseConcurrentViewers (動画ページのデータ)', () => {
  // 2026-11 時点の ytd-watch-flexy.data を縮小したもの
  const response = (videoId: string, renderer: object) => ({
    currentVideoEndpoint: { watchEndpoint: { videoId } },
    contents: { twoColumnWatchNextResults: { results: { results: { contents: [
      { videoPrimaryInfoRenderer: { viewCount: { videoViewCountRenderer: renderer } } },
      { videoSecondaryInfoRenderer: {} },
    ] } } } },
  })
  const live = { viewCount: { runs: [{ text: '369' }, { text: ' 人が視聴中' }], simpleText: '369 人が視聴中' }, isLive: true, originalViewCount: '369' }

  it('配信中なら originalViewCount を返す', () => {
    expect(parseConcurrentViewers(response('89yEOZ_Kr-4', live), '89yEOZ_Kr-4')).toBe(369)
  })

  it('originalViewCount が無ければ表示の数字を読む', () => {
    expect(parseConcurrentViewers(response('a', { ...live, originalViewCount: undefined, viewCount: { simpleText: '26,905 人が視聴中' } }), 'a')).toBe(26905)
  })

  it('配信中でない (再生数) ・別の動画のデータなら undefined', () => {
    expect(parseConcurrentViewers(response('a', { viewCount: { simpleText: '123 回視聴' }, originalViewCount: '123' }), 'a')).toBeUndefined()
    expect(parseConcurrentViewers(response('old', live), 'new')).toBeUndefined()
    expect(parseConcurrentViewers(undefined, 'a')).toBeUndefined()
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

  it('開いた時点の同接と前回までの最大の、大きい方を残す', () => {
    const prev = new Video()
    prev.updateMaxViewers(500, t1)

    const lower = new Video()
    lower.updateMaxViewers(300, t2)
    lower.mergeMaxStats(prev, t2)
    expect(lower).toMatchObject({ maxViewers: 500, maxViewersAt: t1 })

    const higher = new Video()
    higher.updateMaxViewers(800, t2)
    higher.mergeMaxStats(prev, t2)
    expect(higher).toMatchObject({ maxViewers: 800, maxViewersAt: t2 })
  })

  it('同接は最大を超えた時だけ更新し、保存形式は epoch msec', () => {
    const video = new Video()
    expect(video.updateMaxViewers(300, t1)).toBe(true)
    expect(video.updateMaxViewers(200, t2)).toBe(false)
    expect(video).toMatchObject({ maxViewers: 300, maxViewersAt: t1 })
    expect(video.toPlain().maxViewersAt).toBe(t1.getTime())
    expect(Video.fromPlain(video.toPlain()).maxViewersAt).toEqual(t1)
  })

  it('最新の同接は下がっても毎回記録し、最大は超えた時だけ更新する', () => {
    const video = new Video()
    expect(video.updateViewers(300, t1)).toBe(true)
    expect(video.updateViewers(200, t2)).toBe(true)
    expect(video).toMatchObject({ viewers: 200, viewersAt: t2, maxViewers: 300, maxViewersAt: t1 })
    expect(video.updateViewers(200, t2)).toBe(false)

    // 開き直して読めなかった時は前回の値を残す
    const reopened = new Video()
    reopened.mergeMaxStats(video, t2)
    expect(reopened).toMatchObject({ viewers: 200, maxViewers: 300 })
    expect(Video.fromPlain(video.toPlain()).viewersAt).toEqual(t2)
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
