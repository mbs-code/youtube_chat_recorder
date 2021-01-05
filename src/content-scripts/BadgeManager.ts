import Runtime from '../lib/chrome/Runtime'
import Logger from '../loggers/Logger'

export default class BadgeManager {
  protected static badgeCounter = 0

  protected static async clearBadgeText() {
    Logger.trace('📛[BADGE] Clear text')
    await Runtime.sendBadgeText()
  }

  protected static async setBadgeText(text: string) {
    Logger.trace(`📛[BADGE] Set text: ${text}`)
    await Runtime.sendBadgeText(text)
  }

  ///

  public static async addBadgeCounter(add: number) {
    this.badgeCounter += add
    const text = this.badgeCounter >= 1000
      ? '999+'
      : String(this.badgeCounter)
    await this.setBadgeText(text)
  }

  public static async clearBadgeCounter() {
    this.badgeCounter = 0
    await this.clearBadgeText()
  }

  ///

  public static async activateIcon() {
    Logger.trace('📛[BADGE] Activate icon')
    await Runtime.sendIconIsActive(true)
  }

  public static async deactivateIcon() {
    Logger.trace('📛[BADGE] Deactivate icon')
    await Runtime.sendIconIsActive(false)
  }
}
