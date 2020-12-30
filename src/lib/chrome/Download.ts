import { format as dateFormat } from 'date-fns'

export default class Download {
  /**
   * 画像 url を ダウンロードする (png).
   *
   * @param {string} dataUrl image data url
   * @param {string} [filename] 保存する名前
   */
  public static image(dataUrl: string, filename?: string): void {
    const name = (filename || dateFormat(new Date(), 'yyyyMMddTHHmmss')) + '.png'

    const link = document.createElement('a')
    link.download = name
    link.href = dataUrl
    link.click()
  }
}
