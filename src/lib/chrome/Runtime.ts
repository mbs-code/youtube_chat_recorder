import Logger from '../../loggers/Logger'
import type { BackgroundMessage, IconState, MessageResponse, TabMessage } from './messages'

export default class Runtime {
  /**
   * マニフェストを取得する.
   */
  public static getManifest(): chrome.runtime.Manifest {
    return chrome.runtime.getManifest()
  }

  /**
   * 拡張機能のコンテキストが有効か (拡張機能の更新・再読み込み後の content script では false).
   */
  public static isContextValid(): boolean {
    return Boolean(chrome.runtime?.id)
  }

  /**
   * Option page を開く.
   */
  public static async openOptionPage(): Promise<void> {
    await chrome.runtime.openOptionsPage()
  }

  /**
   * Readme page を開く.
   */
  public static async openReadmePage(): Promise<void> {
    await chrome.tabs.create({ url: chrome.runtime.getURL('readme/index.html') })
  }

  ///

  /**
   * background にメッセージを送信する.
   *
   * @return 成功可否
   */
  protected static async sendToBackground(message: BackgroundMessage): Promise<boolean> {
    if (!this.isContextValid()) return false

    try {
      const response: MessageResponse | undefined = await chrome.runtime.sendMessage(message)
      if (!response?.ok) {
        Logger.warn(`message failed: ${message.type} (${response?.error})`)
        return false
      }
      return true
    } catch (err) {
      Logger.warn(`message failed: ${message.type} (${String(err)})`)
      return false
    }
  }

  /**
   * tab の content script にメッセージを送信する.
   *
   * @return 成功可否 (content script が居ないタブなら false)
   */
  protected static async sendToTab(tabId: number, message: TabMessage): Promise<boolean> {
    try {
      const response: MessageResponse | undefined = await chrome.tabs.sendMessage(tabId, message)
      return Boolean(response?.ok)
    } catch {
      return false
    }
  }

  /**
   * background に設定を再読み込みさせる.
   */
  public static async sendLoadConfig(): Promise<boolean> {
    return this.sendToBackground({ type: 'YCR_LOAD_CONFIG' })
  }

  /**
   * (送信元タブの) アイコンバッジに文字を設定する.
   *
   * @param text 付与する文字 (空文字で消える, 4 文字程度まで)
   */
  public static async sendBadgeText(text = ''): Promise<boolean> {
    return this.sendToBackground({ type: 'YCR_SET_BADGE', text })
  }

  /**
   * (送信元タブの) アイコンの状態を設定する.
   */
  public static async sendIconState(state: IconState): Promise<boolean> {
    return this.sendToBackground({ type: 'YCR_SET_ICON', state })
  }

  /**
   * タブのバッジカウンターをリセットさせる.
   */
  public static async sendResetBadge(tabId: number): Promise<boolean> {
    return this.sendToTab(tabId, { type: 'YCR_RESET_BADGE' })
  }
}
