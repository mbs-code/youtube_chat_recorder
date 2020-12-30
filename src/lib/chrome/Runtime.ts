import { browser } from 'webextension-polyfill-ts'

export default class Runtime {
  public static async openOptionPage(): Promise<void> {
    await browser.runtime.openOptionsPage()
  }
}
