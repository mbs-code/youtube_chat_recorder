import type Video from '../../models/Video'

/** 自動でピン止めする動画の条件 (設定). */
export interface PinRule {
  target: 'channelName' | 'title' // どこを見るか (チャンネル名 / 動画のタイトル)
  mode: 'text' | 'regex' // text: 含む (大文字小文字は区別しない), regex: 正規表現 (大文字小文字は区別しない)
  pattern: string
}

export default class PinRuleMatcher {
  /** 正規表現として正しいか. (text なら常に true) */
  public static isValid(rule: PinRule): boolean {
    if (rule.mode !== 'regex') return true
    try {
      new RegExp(rule.pattern, 'i')
      return true
    } catch {
      return false
    }
  }

  /** 1 つの条件に当てはまるか. (空のパターン・不正な正規表現は当てはまらない) */
  public static test(rule: PinRule, video: Video): boolean {
    const pattern = rule.pattern.trim()
    const value = (rule.target === 'channelName' ? video.channelName : video.title) ?? ''
    if (!pattern || !value) return false
    if (rule.mode === 'text') return value.toLowerCase().includes(pattern.toLowerCase())
    try {
      return new RegExp(pattern, 'i').test(value)
    } catch {
      return false
    }
  }

  /** どれかの条件に当てはまるか. */
  public static matches(rules: PinRule[], video: Video): boolean {
    return rules.some(rule => this.test(rule, video))
  }
}
