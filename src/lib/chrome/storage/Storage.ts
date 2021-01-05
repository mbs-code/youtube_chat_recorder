import { browser } from 'webextension-polyfill-ts'

export default class Storage {
  /**
   * ローカルストレージの使用量を取得する
   *
   * @static
   * @return {number} 使用量 byte
   */
  public static async getBytesInUseLocalStorage(): Promise<number> {
    return new Promise((resolve) => {
      // browser にメソッドが無かった
      chrome.storage.local.getBytesInUse(function (bytesInUse: number) {
        resolve(bytesInUse)
      })
    })
  }

  public static async clear(): Promise<void> {
    await browser.storage.local.clear()
  }
}
