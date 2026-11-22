export default class Filer {
  /**
   * 画像 url を png としてダウンロードする.
   *
   * @param dataUrl image data url
   * @param filename 保存する名前 (拡張子なし)
   */
  public static downloadImage(dataUrl: string, filename?: string): void {
    this.downloadFile(dataUrl, (filename || 'download') + '.png')
  }

  /**
   * ファイルをダウンロードする.
   *
   * @param url data url / object url
   * @param filename 保存する名前 (拡張子も)
   */
  public static downloadFile(url: string, filename: string): void {
    const link = document.createElement('a')
    link.download = filename
    link.href = url
    link.click()
  }

  ///

  /**
   * ファイルをテキストとして読み込む.
   */
  public static async readFile(file: File): Promise<string> {
    return await file.text()
  }
}
