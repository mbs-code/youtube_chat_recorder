import { browser, Manifest } from 'webextension-polyfill-ts'
import Logger from '../../loggers/Logger'
import MessageInterface from './interface/MessageInterface'

export default class Runtime {
  /**
   * マニュフェストを取得する.
   *
   * @static
   * @return {Manifest.ManifestBase} manifest object
   */
  public static getManifest(): Manifest.ManifestBase {
    return browser.runtime.getManifest()
  }

  /**
   * Option page を開く.
   *
   * @static
   */
  public static async openOptionPage(): Promise<void> {
    await browser.runtime.openOptionsPage()
  }

  ///

  /**
   * background にメッセージを送信する.
   *
   * @static
   * @param {MessageInterface} message message
   * @return {boolean} 成功可否
   */
  protected static async sendMessage(message: MessageInterface): Promise<boolean> {
    const { response } = await browser.runtime.sendMessage(message)
    if (response !== true) {
      Logger.warn(response)
      return false
    }
    return true
  }

  /**
   * background にて設定を読み込ませる.
   *
   * @static
   * @return {boolean} 成功可否
   */
  public static async sendLoadConfig(): Promise<boolean> {
    return this.sendMessage({ type: 'LOAD_CONFIG' })
  }

  /**
   * アイコンバッジに文字を設定する.
   *
   * @static
   * @param {string} [str] 付与する文字(5文字以降切り捨て)
   * @return {boolean} 成功可否
   */
  public static async sendBadgeText(str?: string): Promise<boolean> {
    return this.sendMessage({
      type: 'BADGE',
      value: str,
    })
  }

  /**
   * アイコンのアクティブ状態を設定する.
   *
   * @static
   * @param {boolean} bool アクティブな状態かどうか
   * @return {boolean} 成功可否
   */
  public static async sendIconIsActive(bool: boolean): Promise<boolean> {
    return this.sendMessage({
      type: 'ACTIVE',
      value: Boolean(bool),
    })
  }
}
