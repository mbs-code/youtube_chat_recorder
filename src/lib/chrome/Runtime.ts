import { browser, Manifest } from 'webextension-polyfill-ts'

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
