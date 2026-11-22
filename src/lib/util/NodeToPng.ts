import domToImage from 'dom-to-image-more'
import Logger from '../../loggers/Logger'

/** 要素の inline style を一時的に書き換え、元に戻すための記録. */
type StyleBackup = { element: HTMLElement, property: string, value: string }

function overrideStyle(backups: StyleBackup[], element: HTMLElement | null, property: string, value: string): void {
  if (!element) return
  backups.push({ element, property, value: element.style.getPropertyValue(property) })
  element.style.setProperty(property, value)
}

function restoreStyles(backups: StyleBackup[]): void {
  for (const { element, property, value } of backups.reverse()) {
    if (value) {
      element.style.setProperty(property, value)
    } else {
      element.style.removeProperty(property)
    }
  }
}

export default class NodeToPng {
  /**
   * チャット欄の要素を png data url に変換する.
   *
   * - 描画崩れを防ぐため、描画中だけ一部の style を書き換える.
   *
   * @param node 対象のチャット要素
   */
  public static async generateChatImageUrl(node: HTMLElement): Promise<string> {
    const backups: StyleBackup[] = []
    try {
      // ■ 作成者名が改行されることが多々あるので改行させない
      overrideStyle(backups, node.querySelector<HTMLElement>('#author-name'), 'white-space', 'nowrap')

      // ■ 通常コメントが (絵文字などで) 謎改行することがあるので幅を 100% に
      // (querySelector は祖先も含めて評価するので、node 自身が text-message-renderer の時だけ一致する)
      overrideStyle(backups, node.querySelector<HTMLElement>('yt-live-chat-text-message-renderer #content'), 'width', '100%')

      // ■ コメントの背景色が transparent なので親の背景色を指定
      const chatRenderer = node.closest<HTMLElement>('yt-live-chat-renderer')
      if (chatRenderer) {
        const view = node.ownerDocument.defaultView ?? window
        overrideStyle(backups, node, 'background-color', view.getComputedStyle(chatRenderer).backgroundColor)
      }

      return await this.generate(node, true)
    } finally {
      restoreStyles(backups)
    }
  }

  /**
   * HTMLElement を png data url に変換する.
   *
   * @param node 対象 node
   * @param strict 描画失敗 (背景が真っ黒) を検出してエラーにする
   */
  public static async generate(node: HTMLElement, strict = false): Promise<string> {
    const displays = this.calcNodeDisplaySize(node)
    Logger.trace(`> 🎨 [start] dom size: ${displays.width}x${displays.height}`)

    const canvas = await domToImage.toCanvas(node, {
      width: displays.width, // 指定しないと横幅を揃えられない
      height: displays.height, // dom-to-image-more v3 は指定しないと padding 分が切れる
      // スパチャの menu が展開されるため描画しない (iframe 内のノードは realm が違うので instanceof は使わない)
      filter: (child: Node) => (child as Element).id !== 'menu',
      // YouTube が読み込む Google Fonts の CSS は別ドメインで中身を読めず、毎回 console.error が出る.
      // 読めない CSS は飛ばして描画は続くので、ログだけ止める.
      ignoreCSSRuleErrors: true,
    })

    const ctx = canvas.getContext('2d')
    const { width, height } = canvas
    Logger.trace(`> 🎨 generated canvas: ${width}x${height}`)
    if (!ctx || width === 0 || height === 0) {
      throw new Error('Failed to generate canvas')
    }

    // ■ 背景が真っ黒なら描画失敗
    if (strict) {
      const rightTopColors = ctx.getImageData(Math.max(0, width - 5), Math.min(5, height - 1), 2, 2).data
      if (rightTopColors.every(c => c === 0)) {
        throw new Error('Failed to draw DOM.')
      }
    }

    // ■ 下部に透明部分ができることが多々あるので切り取る
    const colors = ctx.getImageData(0, 0, 1, height).data
    let opaqueHeight = height
    for (let i = colors.length - 4; i >= 0; i -= 4) {
      if (colors[i] !== 0 || colors[i + 1] !== 0 || colors[i + 2] !== 0 || colors[i + 3] !== 0) {
        opaqueHeight = i / 4 + 1
        break
      }
    }
    Logger.trace(`> 🎨 opaque height: ${opaqueHeight}, fix: ${opaqueHeight < height}`)

    let output = canvas
    if (opaqueHeight < height) {
      output = document.createElement('canvas')
      output.width = width
      output.height = opaqueHeight
      output.getContext('2d')?.drawImage(canvas, 0, 0, width, opaqueHeight, 0, 0, width, opaqueHeight)
    }

    const dataUrl = output.toDataURL('image/png')
    Logger.trace(`draw [success]: ${output.width}x${output.height}, ${dataUrl.length.toLocaleString()} byte`)
    return dataUrl
  }

  /**
   * 複数の画像を縦に結合する.
   *
   * @param urls 画像 url 配列
   * @return png data url
   */
  public static async merge(urls: string[]): Promise<string> {
    Logger.trace(`> 🎨 [start] merge images (len: ${urls.length})`)

    const images = await Promise.all(urls.map(url => this.loadImage(url)))
    const canvasWidth = Math.max(...images.map(img => img.width))
    const canvasHeight = images.reduce((sum, img) => sum + img.height, 0)

    const canvas = document.createElement('canvas')
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas generation failure (ctx)')
    }

    // 背景を白で塗っておく
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    let top = 0
    for (const img of images) {
      ctx.drawImage(img, 0, top)
      top += img.height
    }

    const dataUrl = canvas.toDataURL('image/png')
    Logger.trace(`draw [success]: ${canvas.width}x${canvas.height}, ${dataUrl.length.toLocaleString()} byte`)
    return dataUrl
  }

  ///

  protected static loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = src
    })
  }

  protected static calcNodeDisplaySize(node: HTMLElement): { width: number, height: number } {
    const view = node.ownerDocument.defaultView ?? window
    const style = view.getComputedStyle(node)
    const sum = (...values: string[]) => values.reduce((acc, v) => acc + (parseFloat(v) || 0), 0)

    return {
      width: node.offsetWidth + sum(style.marginLeft, style.marginRight, style.borderLeftWidth, style.borderRightWidth),
      height: node.offsetHeight + sum(style.marginTop, style.marginBottom, style.borderTopWidth, style.borderBottomWidth),
    }
  }
}
