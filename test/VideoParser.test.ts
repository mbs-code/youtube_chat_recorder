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
