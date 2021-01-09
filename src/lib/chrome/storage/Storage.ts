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

  /// ////////////////////////////////////////

  public static async export(prettier: boolean = false): Promise<string> {
    const plain = await browser.storage.local.get()

    // 文字列化する
    const text = plain
      ? JSON.stringify(plain, null, (prettier ? 2 : undefined))
      : '{}' // 空文字

    // blob にして url を出力
    const blob = new Blob([text], { type: 'octet/stream' })
    const urlText = window.URL.createObjectURL(blob)
    return urlText
  }

  public static async import(text: string): Promise<void> {
    // json 変換して置き換える
    const json = JSON.parse(text)
    await browser.storage.local.set(json)
  }
}
