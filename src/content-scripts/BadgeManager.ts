import Runtime from '../lib/chrome/Runtime'
import Logger from '../loggers/Logger'

/** このタブのアイコンとバッジ (取得したチャット数) を管理する. */
export default class BadgeManager {
  /** このページで保存したチャットの数. */
  protected static badgeCounter = 0

  /** 取得数を増やしてバッジに出す (1000 以上は 999+). */
  public static async addBadgeCounter(add: number): Promise<void> {
    this.badgeCounter += add
    const text = this.badgeCounter >= 1000 ? '999+' : String(this.badgeCounter)
    Logger.trace(`📛[BADGE] Set text: ${text}`)
    await Runtime.sendBadgeText(text)
  }

  /** 取得数を 0 に戻してバッジを消す. (popup を開いた時、動画が変わった時) */
  public static async clearBadgeCounter(): Promise<void> {
    this.badgeCounter = 0
    Logger.trace('📛[BADGE] Clear text')
    await Runtime.sendBadgeText('')
  }

  ///

  /** 赤: チャットを監視中. */
  public static async activateIcon(): Promise<void> {
    Logger.trace('📛[BADGE] Activate icon')
    await Runtime.sendIconState('active')
  }

  /** グレー: 対象外のページ. */
  public static async deactivateIcon(): Promise<void> {
    Logger.trace('📛[BADGE] Deactivate icon')
    await Runtime.sendIconState('inactive')
  }

  /** 青: 動画のページでチャット欄を待っている. */
  public static async waitingIcon(): Promise<void> {
    Logger.trace('📛[BADGE] Waiting icon')
    await Runtime.sendIconState('waiting')
  }
}
