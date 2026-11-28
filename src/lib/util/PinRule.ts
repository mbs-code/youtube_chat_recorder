import type Video from '../../models/Video'

/**
 * 自動でピン止めする動画の条件 (設定). チャットフィルターのテキストマッチングと同じ照合のしかた.
 *
 * - 既定は「含む」. isExact は完全一致、isRegex は正規表現 (どちらも大文字小文字を区別する).
 */
export interface PinRule {
  key: string
  target: 'channelName' | 'title' // 見る場所 (チャンネル名 / 動画のタイトル)
  match: string
  isExact: boolean
  isRegex: boolean
}

export default class PinRuleMatcher {
  /** 1 つの条件に当てはまるか. (空の文字・不正な正規表現は当てはまらない) */
  public static test(rule: PinRule, video: Video): boolean {
    const value = (rule.target === 'channelName' ? video.channelName : video.title) ?? ''
    if (!rule.match || !value) return false
    if (rule.isRegex) {
      try {
        return new RegExp(rule.match).test(value)
      } catch {
        return false
      }
    }
    return rule.isExact ? value === rule.match : value.includes(rule.match)
  }

  /** どれかの条件に当てはまるか. */
  public static matches(rules: PinRule[], video: Video): boolean {
    return rules.some(rule => this.test(rule, video))
  }
}
