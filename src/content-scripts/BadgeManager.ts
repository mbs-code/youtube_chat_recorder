import Runtime from '../lib/chrome/Runtime'
import Logger from '../loggers/Logger'

/** このタブのアイコンとバッジ (取得したチャット数) を管理する. */
export default class BadgeManager {
  protected static badgeCounter = 0

  public static async addBadgeCounter(add: number): Promise<void> {
    this.badgeCounter += add
    const text = this.badgeCounter >= 1000 ? '999+' : String(this.badgeCounter)
    Logger.trace(`📛[BADGE] Set text: ${text}`)
    await Runtime.sendBadgeText(text)
  }

  public static async clearBadgeCounter(): Promise<void> {
    this.badgeCounter = 0
    Logger.trace('📛[BADGE] Clear text')
    await Runtime.sendBadgeText('')
  }

  ///

  public static async activateIcon(): Promise<void> {
    Logger.trace('📛[BADGE] Activate icon')
    await Runtime.sendIconState('active')
  }

  public static async deactivateIcon(): Promise<void> {
    Logger.trace('📛[BADGE] Deactivate icon')
    await Runtime.sendIconState('inactive')
  }

  public static async waitingIcon(): Promise<void> {
    Logger.trace('📛[BADGE] Waiting icon')
    await Runtime.sendIconState('waiting')
  }
}
