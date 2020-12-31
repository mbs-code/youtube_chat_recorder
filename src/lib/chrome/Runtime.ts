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
}
