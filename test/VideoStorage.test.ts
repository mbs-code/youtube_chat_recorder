import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import VideoStorage from '../src/lib/chrome/storage/VideoStorage'
import Video from '../src/models/Video'

describe('VideoStorage', () => {
  let stored: Record<string, unknown>
  beforeEach(() => {
    stored = {}
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: async (key: string) => ({ [key]: stored[key] }),
          set: async (items: Record<string, unknown>) => Object.assign(stored, items),
          remove: async (keys: string | string[]) => {
            for (const key of [keys].flat()) delete stored[key]
          },
        },
      },
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  const video = (id: string) => Object.assign(new Video(), { id })

  it('最大保存数を超えた古い動画は消すが、自動で削除しない動画は数えず残す', async () => {
    await VideoStorage.save(video('a'), 2)
    await VideoStorage.setProtected('a', true)
    stored.b = [] // b のチャット
    await VideoStorage.save(video('b'), 2)
    await VideoStorage.save(video('c'), 2)
    await VideoStorage.save(video('d'), 2)

    const videos = await VideoStorage.getAll()
    expect(videos.map(v => v.id).sort()).toEqual(['a', 'c', 'd'])
    expect(stored.b).toBeUndefined()
  })

  it('開き直しても自動で削除しない設定を引き継ぐ', async () => {
    await VideoStorage.save(video('a'), 2)
    await VideoStorage.setProtected('a', true)
    await VideoStorage.save(video('a'), 2)

    expect((await VideoStorage.get('a'))?.isProtected).toBe(true)
  })

  it('初めて保存する動画が条件に合えばピン止めし、外した後は戻さない', async () => {
    const rules = [{ target: 'title' as const, mode: 'text' as const, pattern: '歌枠' }]
    const titled = (id: string, title: string) => Object.assign(new Video(), { id, title })

    await VideoStorage.save(titled('a', '歌枠 1'), 5, rules)
    await VideoStorage.save(titled('b', '雑談'), 5, rules)
    expect((await VideoStorage.getAll()).map(v => [v.id, v.isProtected])).toEqual([['b', false], ['a', true]])

    await VideoStorage.setProtected('a', false)
    await VideoStorage.save(titled('a', '歌枠 1'), 5, rules)
    expect((await VideoStorage.getAll()).find(v => v.id === 'a')?.isProtected).toBe(false)
  })
})
