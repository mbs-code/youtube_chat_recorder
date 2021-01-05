import { browser, Tabs } from 'webextension-polyfill-ts'

export default class BrowserTabs {
  /**
   * アクティブなタブの情報取得する.
   *
   * @static
   * @return {Tabs.Tab | undefined} tab情報
   */
  public static async getActiveTab(): Promise<Tabs.Tab | undefined> {
    const tabs = await browser.tabs.query({ active: true, lastFocusedWindow: true })
    return tabs[0]
  }

  public static async windowOpen(url: string, tab?: Tabs.Tab ) {
    return await browser.tabs.create({ url, openerTabId: tab?.id })
  }
}
