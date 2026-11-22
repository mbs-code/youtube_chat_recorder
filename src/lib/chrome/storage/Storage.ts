import { createJsonObjectURL } from './BaseStorage'

/** chrome.storage.local 全体の操作. */
export default class Storage {
  /**
   * ローカルストレージの使用量 (byte) を取得する.
   */
  public static async getBytesInUseLocalStorage(): Promise<number> {
    return await chrome.storage.local.getBytesInUse(null)
  }

  public static async clear(): Promise<void> {
    await chrome.storage.local.clear()
  }

  /// ////////////////////////////////////////

  /** 全データを JSON にしてダウンロード用の object url を返す. */
  public static async export(prettier = false): Promise<string> {
    const plain = await chrome.storage.local.get(null)
    return createJsonObjectURL(plain, prettier)
  }

  public static async import(text: string): Promise<void> {
    await chrome.storage.local.set(JSON.parse(text))
  }
}
