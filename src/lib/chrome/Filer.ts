export default class Filer {
  /**
   * 画像 url を ダウンロードする (png).
   *
   * @param {string} dataUrl image data url
   * @param {string} [filename] 保存する名前
   */
  public static downloadImage(dataUrl: string, filename?: string): void {
    const name = (filename || 'download') + '.png'
    this.downloadFile(dataUrl, name)
  }

  /**
   * ファイルを ダウンロードする.
   *
   * @param {string} dataUrl data url
   * @param {string} [filename] 保存する名前(拡張子も)
   */
  public static downloadFile(dataUrl: string, filename: string): void {
    const name = filename

    const link = document.createElement('a')
    link.download = name
    link.href = dataUrl
    link.click()
  }

  ///

  /**
   * ファイルを読み込む.
   * @param {File} file 読み込む file object
   * @return {string | null} 読み込んだテキストデータ
   */
  public static readFile(file: File): Promise<string | null> {
    return new Promise((resolve) => {
      if (!file) resolve(null)
        const reader = new FileReader()
        reader.onload = async () => {
          const text = reader.result as string
          resolve(text)
        }
        reader.readAsText(file)
    })
  }
}
