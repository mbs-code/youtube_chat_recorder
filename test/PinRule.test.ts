import { describe, expect, it } from 'vitest'
import PinRuleMatcher, { type PinRule } from '../src/lib/util/PinRule'
import Video from '../src/models/Video'

describe('PinRuleMatcher', () => {
  const video = Object.assign(new Video(), { id: 'a', title: '【歌枠】Sing Along', channelName: 'Foo Channel' })
  const rule = (r: Partial<PinRule>): PinRule => ({ key: 'k', target: 'title', match: '', isExact: false, isRegex: false, ...r })

  it('既定は含んでいれば一致する', () => {
    expect(PinRuleMatcher.test(rule({ match: '歌枠' }), video)).toBe(true)
    expect(PinRuleMatcher.test(rule({ target: 'channelName', match: 'Foo' }), video)).toBe(true)
    expect(PinRuleMatcher.test(rule({ target: 'channelName', match: '歌枠' }), video)).toBe(false)
  })

  it('完全一致', () => {
    expect(PinRuleMatcher.test(rule({ target: 'channelName', match: 'Foo Channel', isExact: true }), video)).toBe(true)
    expect(PinRuleMatcher.test(rule({ target: 'channelName', match: 'Foo', isExact: true }), video)).toBe(false)
  })

  it('正規表現', () => {
    expect(PinRuleMatcher.test(rule({ isRegex: true, match: '^【.+】' }), video)).toBe(true)
    expect(PinRuleMatcher.test(rule({ isRegex: true, match: 'Along$' }), video)).toBe(true)
    expect(PinRuleMatcher.test(rule({ isRegex: true, match: 'sing$' }), video)).toBe(false)
  })

  it('空の文字・不正な正規表現は一致しない', () => {
    expect(PinRuleMatcher.test(rule({ match: '' }), video)).toBe(false)
    expect(PinRuleMatcher.test(rule({ isRegex: true, match: '(' }), video)).toBe(false)
  })

  it('どれかに一致すれば true', () => {
    expect(PinRuleMatcher.matches([rule({ match: 'x' }), rule({ match: 'Sing' })], video)).toBe(true)
    expect(PinRuleMatcher.matches([], video)).toBe(false)
  })
})
