import { browser } from 'webextension-polyfill-ts'

export default class Tabs {
  /**
   * アクティブなタブの情報取得する.
   *
   * @static
   * @return {Tabs.Tab | undefined} tab情報
   */
  public static async getActiveTab() {
    const tabs = await browser.tabs.query({ active: true, lastFocusedWindow: true })
    return tabs[0]
  }
}
