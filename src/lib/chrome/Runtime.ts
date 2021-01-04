import { browser, Manifest } from 'webextension-polyfill-ts'
import RuntimeMessageInterface from '../../interface/RuntimeMessageInterface'

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
   * アイコンバッジに文字を設定する.
   * @param {string} [str] 付与する文字(5文字以降切り捨て)
   */
  public static async sendBadgeText(str?: string): Promise<void> {
    const message: RuntimeMessageInterface = {
      type: 'badge',
      value: str,
    }
    await browser.runtime.sendMessage(message)
  }

  /**
   * アイコンのアクティブ状態を設定する.
   * @param {boolean} bool アクティブな状態かどうか
   */
  public static async sendIconIsActive(bool: boolean): Promise<void> {
    const message: RuntimeMessageInterface = {
      type: 'active',
      value: Boolean(bool),
    }
    await browser.runtime.sendMessage(message)
  }

  /**
   * ローカルストレージの使用量を取得する
   *
   * @static
   * @return {number} 使用量 byte
   */
  public static async getBytesInUseLocalStorage(): Promise<number> {
    return new Promise((resolve) => {
      chrome.storage.local.getBytesInUse(function (bytesInUse: number) {
        resolve(bytesInUse)
      })
    })
  }

  /**
   * ローカルストレージを空にする.
   *
   * @static
   */
  public static async clearLocalStorage(): Promise<void> {
    await browser.storage.local.clear()
  }
}
