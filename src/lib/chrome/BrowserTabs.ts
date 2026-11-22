export default class BrowserTabs {
  /**
   * アクティブなタブの情報を取得する.
   *
   * - url は host_permissions (youtube) に一致するタブのみ取得できる.
   */
  public static async getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    return tab
  }

  /**
   * 新しいタブで url を開く.
   */
  public static async windowOpen(url: string, opener?: chrome.tabs.Tab): Promise<chrome.tabs.Tab> {
    return await chrome.tabs.create({ url, openerTabId: opener?.id })
  }
}
