import { browser, Manifest, Tabs } from 'webextension-polyfill-ts'
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
   * @param {Tabs.Tab} [tab] 送信する tab, 未指定で backgound
   * @return {boolean} 成功可否
   */
  protected static async sendMessage(message: MessageInterface, tab?: Tabs.Tab): Promise<boolean> {
    const { response } = tab?.id
      ? await browser.tabs.sendMessage(tab.id, message)
      : await browser.runtime.sendMessage(message)

    if (response !== true) {
      Logger.warn(response)
      return false
    }
    return true
  }

  /**
   * 設定を読み込ませる (Tab可).
   *
   * @static
   * @param {Tabs.Tab} [tab] 送信する tab, 未指定で backgound
   * @return {boolean} 成功可否
   */
  public static async sendLoadConfig(tab?: Tabs.Tab): Promise<boolean> {
    return this.sendMessage({ type: 'LOAD_CONFIG' }, tab)
  }

  /**
   * アイコンバッジに文字を設定する.
   *
   * @static
   * @param {Tabs.Tab} [tab] 送信する tab, 未指定で backgound
   * @param {string} [str] 付与する文字(5文字以降切り捨て)
   * @return {boolean} 成功可否
   */
  public static async sendBadgeText(str?: string, tab?: Tabs.Tab): Promise<boolean> {
    return this.sendMessage({
      type: 'BADGE',
      value: str,
    }, tab)
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
