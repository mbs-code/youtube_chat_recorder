import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TimelineRecorder from '../src/content-scripts/TimelineRecorder'
import Chat from '../src/models/Chat'
import { mergeTimeline, mergeViewCounts, MINUTE, TimelineBuffer, toMinute } from '../src/models/Timeline'

const base = new Date(2026, 10, 22, 14, 0, 0).getTime()

describe('Timeline', () => {
  it('toMinute: 分の先頭にそろえる', () => {
    expect(toMinute(base + 59_999)).toBe(base)
    expect(toMinute(new Date(base + MINUTE + 1))).toBe(base + MINUTE)
  })

  it('TimelineBuffer: コメントは数え、同時接続数はその分の最大を残す', () => {
    const buffer = new TimelineBuffer()
    buffer.addComment(base + 1000)
    buffer.addComment(base + 2000)
    buffer.addViewers(300, base + 3000)
    buffer.addViewers(250, base + 4000)
    buffer.addComment(base + MINUTE)

    expect(buffer.take()).toEqual([
      { t: base, comments: 2, viewers: 300 },
      { t: base + MINUTE, comments: 1 },
    ])
    expect(buffer.size).toBe(0)
  })

  it('mergeTimeline: 同じ分はコメント数を合計し、同時接続数は大きい方 (時刻の昇順)', () => {
    const merged = mergeTimeline(
      [{ t: base + MINUTE, comments: 3, viewers: 100 }, { t: base, comments: 1 }],
      [{ t: base + MINUTE, comments: 2, viewers: 80 }, { t: base, comments: 0, viewers: 50 }],
    )
    expect(merged).toEqual([
      { t: base, comments: 1, viewers: 50 },
      { t: base + MINUTE, comments: 5, viewers: 100 },
    ])
  })
})

describe('mergeViewCounts', () => {
  it('同じ分は大きい方を残し、時刻の昇順にする', () => {
    const merged = mergeViewCounts([{ t: 2 * MINUTE, views: 200 }, { t: MINUTE, views: 100 }], [{ t: MINUTE, views: 150 }])
    expect(merged).toEqual([{ t: MINUTE, views: 150 }, { t: 2 * MINUTE, views: 200 }])
  })
})

describe('TimelineRecorder', () => {
  let stored: Record<string, unknown>

  beforeEach(() => {
    stored = {}
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: async (key: string) => ({ [key]: stored[key] }),
          set: async (items: Record<string, unknown>) => Object.assign(stored, items),
        },
      },
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  const chat = (id: string, time: number) => Object.assign(new Chat(), { id, timestamp: new Date(time) })

  it('開く前のチャットと、同じチャットは数えない', async () => {
    const recorder = new TimelineRecorder()
    recorder.start('vid', new Date(base + 5 * MINUTE))

    recorder.addChat(chat('old', base + 2 * MINUTE)) // 開く前
    recorder.addChat(chat('a', base + 5 * MINUTE + 1000))
    recorder.addChat(chat('a', base + 5 * MINUTE + 1000)) // 同じチャット
    recorder.addChat(chat('b', base + 6 * MINUTE))
    recorder.addViewers(1234, new Date(base + 5 * MINUTE + 2000))
    await recorder.stop()

    expect(stored['@timeline:vid']).toEqual([
      { t: base + 5 * MINUTE, comments: 1, viewers: 1234 },
      { t: base + 6 * MINUTE, comments: 1 },
    ])
  })

  it('記録中でなければ何もしない', async () => {
    const recorder = new TimelineRecorder()
    recorder.addChat(chat('a', base))
    recorder.addViewers(10)
    await recorder.flush()
    expect(stored).toEqual({})
  })
})
