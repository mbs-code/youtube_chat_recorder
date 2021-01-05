export default class Download {
  /**
   * 画像 url を ダウンロードする (png).
   *
   * @param {string} dataUrl image data url
   * @param {string} [filename] 保存する名前
   */
  public static image(dataUrl: string, filename?: string): void {
    const name = (filename || 'download') + '.png'
    this.file(dataUrl, name)
  }

  /**
   * ファイルを ダウンロードする.
   *
   * @param {string} dataUrl data url
   * @param {string} [filename] 保存する名前(拡張子も)
   */
  public static file(dataUrl: string, filename: string): void {
    const name = filename

    const link = document.createElement('a')
    link.download = name
    link.href = dataUrl
    link.click()
  }
}
