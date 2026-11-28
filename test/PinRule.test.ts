import { describe, expect, it } from 'vitest'
import PinRuleMatcher, { type PinRule } from '../src/lib/util/PinRule'
import Video from '../src/models/Video'

describe('PinRuleMatcher', () => {
  const video = Object.assign(new Video(), { id: 'a', title: '【歌枠】Sing Along', channelName: 'Foo Channel' })
  const rule = (r: Partial<PinRule>): PinRule => ({ target: 'title', mode: 'text', pattern: '', ...r })

  it('テキストは含んでいれば一致する (大文字小文字は区別しない)', () => {
    expect(PinRuleMatcher.test(rule({ pattern: '歌枠' }), video)).toBe(true)
    expect(PinRuleMatcher.test(rule({ target: 'channelName', pattern: 'foo' }), video)).toBe(true)
    expect(PinRuleMatcher.test(rule({ target: 'channelName', pattern: '歌枠' }), video)).toBe(false)
  })

  it('正規表現で一致する', () => {
    expect(PinRuleMatcher.test(rule({ mode: 'regex', pattern: '^【.+】' }), video)).toBe(true)
    expect(PinRuleMatcher.test(rule({ mode: 'regex', pattern: 'sing$' }), video)).toBe(false)
  })

  it('空のパターン・不正な正規表現は一致しない', () => {
    expect(PinRuleMatcher.test(rule({ pattern: ' ' }), video)).toBe(false)
    expect(PinRuleMatcher.test(rule({ mode: 'regex', pattern: '(' }), video)).toBe(false)
    expect(PinRuleMatcher.isValid(rule({ mode: 'regex', pattern: '(' }))).toBe(false)
  })

  it('どれかに一致すれば true', () => {
    expect(PinRuleMatcher.matches([rule({ pattern: 'x' }), rule({ pattern: 'sing' })], video)).toBe(true)
    expect(PinRuleMatcher.matches([], video)).toBe(false)
  })
})
