import domToImage from 'dom-to-image-more'
import Logger from '../../loggers/Logger'

export default class NodeToPng {
  /**
   * HTMLElement を png data url に変換する.
   *
   * @static
   * @param {HTMLElement} node 対象 node
   * @return {string} png data url
   */
  public static async generateChatImageUrl(node: HTMLElement): Promise<string> {
    let author
    let content
    let chatRenderer

    let authorWhiteSpace
    let contentWidth
    let chatBackground

    try {
      // TODO: 直接 css を弄っているが、どうせすぐ消えるし... (できれば clone に適用したい... )
      // 実装が環境依存すぎるので色々修正したいね...
      // このプルリクを適用してもいいかも https://github.com/1904labs/dom-to-image-more/pull/10

      // ■ 作成者が改行されることが多々あるので改行
      author = node.querySelector<HTMLElement>('#author-name')
      if (author) {
        authorWhiteSpace = author.style.whiteSpace
        author.style.whiteSpace = 'nowrap'
      }

      // ■ 通常コメが改行されることがあるので幅を 100% に修正
      // ex) 絵文字などの謎改行
      // 他の node では見受けられなかった
      content = node.querySelector<HTMLElement>('yt-live-chat-text-message-renderer #content')
      if (content) {
        contentWidth = content.style.width
        content.style.width = '100%'
      }

      // ■ コメントの背景色が transparent なので親の色を指定
      chatRenderer = node.closest<HTMLElement>('yt-live-chat-renderer') // 直近の親 (多分見つかる)
      if (chatRenderer) {
        chatBackground = node.style.backgroundColor
        const style = window.getComputedStyle(chatRenderer)
        node.style.backgroundColor = style.backgroundColor // NOTE: デバッグ時は色を付けると良い
      }

      // データURLにする
      const dataUrl = await this.generage(node, true)
      return dataUrl
    } finally {
      // 元に戻す
      if (author && authorWhiteSpace) author.style.whiteSpace = authorWhiteSpace
      if (content && contentWidth) content.style.width = contentWidth
      if (chatRenderer && chatBackground) chatRenderer.style.width = chatBackground
    }
  }

  /**
   * HTMLElement を png data url に変換する.
   *
   * @static
   * @param {HTMLElement} node 対象 node
   * @param {boolean} strict チャットを保存する際に背景色を確認するモード
   * @return {string} png data url
   */
  public static async generage(node: HTMLElement, strict: boolean = false): Promise<string> {
    return new Promise((resolve, reject) => {
      // <<単純移植>>
      // node は消えたら描画できないので、引数で指定させる
      // 他の処理に影響を与えないように非同期処理で

      // dom のサイズを取得
      const displays = this.calcNodeDisplaySize(node)
      Logger.trace(`> 🎨 [start] dom size: ${displays.width}x${displays.height}`)

      // 画像にする
      // TODO: scale にも対応させる
      domToImage.toCanvas(node, {
        width: displays.width, // 指定しないと横幅を揃えられない
        // height: displays.height, // 必要なさそう
        style: {
          // marginTop: '4px' // これを適用すれば単行コメの余白が正確になるが、他が駄目になる
        },
        filter: (node: HTMLElement) => {
          return node.id !== 'menu' // スパチャの menu が展開されるため描画スキップ
        }
      }).then((canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext('2d')
        const width = canvas.width
        const height = canvas.height
        Logger.trace(`> 🎨 generated canvas: ${width}x${height}`)

        if (!ctx) {
          throw new Error('Failed to generate canvas (ctx)')
        }

        // ■ もし背景が真っ黒なら取得失敗
        if (strict) {
          const rightTopColors = ctx.getImageData(width - 5, 5, 2, 2).data
          const isBlack = rightTopColors.every(c => c === 0)
          if (isBlack) {
            throw new Error('Failed to draw DOM.')
          }
        }

        // ■ 下部に透過部分が発生することが多々あるので修正
        const colors = ctx.getImageData(0, 0, 1, height).data
        let threshold = height // 透明ではない高さ
        for (let i = colors.length - 4; i >= 0; i -= 4) {
          const [r, g, b, a] = [colors[i], colors[i + 1], colors[i + 2], colors[i + 3]]
          if (r !== 0 || g !== 0 || b !== 0 || a !== 0) {
            threshold = i / 4
            break
          }
        }
        const sizeThreshhold = threshold > 0 ? threshold + 1 : threshold // 1~ の数字系に直す
        Logger.trace(`> 🎨 opaque height: ${sizeThreshhold}, fix: ${sizeThreshhold < height}`)

        // 閾値が高さより小さいなら切り取る
        let nCanvas: HTMLCanvasElement
        if (sizeThreshhold < height) {
          nCanvas = document.createElement('canvas')
          nCanvas.width = canvas.width
          nCanvas.height = threshold + 1

          const nctx = nCanvas.getContext('2d')
          if (!nctx) {
            throw new Error('Failed to generate canvas (nctx)')
          }

          nctx.drawImage(canvas, 0, 0, width, threshold + 1, 0, 0, width, threshold + 1)
          Logger.trace(`> 🎨 adjusted canvas: ${nCanvas.width}x${nCanvas.height}`)
        } else {
          nCanvas = canvas
        }

        // url 生成
        const dataUrl = nCanvas.toDataURL('image/png')
        Logger.trace(`draw [success]: ${nCanvas.width}x${nCanvas.height}, ${dataUrl.length.toLocaleString()} byte`)

        resolve(dataUrl)
      })
      .catch((error: Error) => {
        reject(error)
      })
    })
  }

  /**
   * 複数の画像を結合する.
   *
   * @param {string[]} urls 画像 url 配列
   * @return {string} png data url
   */
  public static async merge(urls: string[]): Promise<string> {
    Logger.trace(`> 🎨 [start] merge images (len: ${urls.length})`)

    let canvasWidth = 0
    let canvasHeight = 0

    // 画像の生成をしながら、キャンバスサイズ計算
    const images = []
    for (const url of urls) {
      const image = await this.loadImage(url)
      const [iw, ih] = [image.width, image.height]

      if (canvasWidth < iw) canvasWidth = iw
      canvasHeight += ih
      images.push(image)
    }

    // キャンバスの生成
    const canvas = document.createElement('canvas')
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    Logger.trace(`> 🎨 generated canvas: ${canvasWidth}x${canvasHeight}`)

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas generation failure (ctx)')
    }

    // 背景を白で塗っておく
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 一枚ずつ vertical に貼っていく
    let heightCnt = 0
    for (const img of images) {
      const ih = img.height
      ctx.drawImage(img, 0, heightCnt)
      heightCnt += ih
    }

    // 画像の生成
    const dataUrl = canvas.toDataURL('image/png')
    Logger.trace(`draw [success]: ${canvas.width}x${canvas.height}, ${dataUrl.length.toLocaleString()} byte`)

    return dataUrl
  }

  ///

  protected static async loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = (e) => reject(e)
      img.src = src
    })
  }

  protected static calcNodeDisplaySize(node: HTMLElement): { width: number, height: number } {
    const style = window.getComputedStyle(node)
    const width = node.offsetWidth
    const widthMargin = parseFloat(style.marginLeft) + parseFloat(style.marginRight)
    const widthBorder = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth)

    const height = node.offsetHeight
    const heightMargin = parseFloat(style.marginTop) + parseFloat(style.marginBottom)
    const heightBorder = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)

    return {
      width: width + widthMargin + widthBorder,
      height: height+ heightMargin + heightBorder,
    }
  }
}
