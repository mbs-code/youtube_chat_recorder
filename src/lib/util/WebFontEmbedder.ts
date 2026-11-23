import Logger from '../../loggers/Logger'

/** YouTube が読み込んでいる Google Fonts の CSS (Roboto, YouTube Sans など) の url の先頭. */
const FONT_CSS_ORIGIN = 'https://fonts.googleapis.com/'

/**
 * 埋め込む文字の範囲 (Google Fonts の CSS の `/* latin *\/` のようなコメント).
 *
 * - 日本語は Roboto に含まれず、YouTube の画面でも端末のフォントで描かれるので不要.
 * - 全範囲を埋め込むと 1 枚ごとに数 MB になるので、英数字 (latin) だけにする.
 */
const SUBSETS = ['latin']

/** `/* latin *\/ @font-face { ... }` の組を取り出す. */
const FONT_FACE_RE = /\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g

/** 作成済みの CSS (ページを開いている間は使い回す). */
let cache: Promise<string> | undefined

/**
 * 画像化で使う Web フォントの CSS を、フォントファイルを data url にして返す.
 *
 * - 画像化 (SVG を img として読み込む) ではページの Web フォントが使えないため、フォントを埋め込む必要がある.
 * - Google Fonts の CSS は別ドメインで `cssRules` を読めないので、fetch して作り直す (CORS は許可されている).
 * - 1 回だけ作って使い回す. 失敗したら空文字 (端末のフォントで描かれる) を返し、次回やり直す.
 *
 * @param doc チャット欄 (iframe) の document. 見つからなければ親ページの document も探す
 */
export function getEmbeddedFontCss(doc: Document): Promise<string> {
  cache ??= build(doc).catch((err) => {
    Logger.error(err)
    cache = undefined
    return ''
  })
  return cache
}

async function build(doc: Document): Promise<string> {
  const hrefs = new Set<string>()
  // <link> の href は "//fonts..." のように書かれていることがあるので、解決済みの styleSheets の href を見る
  for (const d of [doc, document]) {
    for (const sheet of Array.from(d.styleSheets)) {
      if (sheet.href?.startsWith(FONT_CSS_ORIGIN)) hrefs.add(sheet.href)
    }
  }

  const faces: string[] = []
  for (const href of hrefs) {
    const css = await fetchText(href)
    for (const [, subset, face] of css.matchAll(FONT_FACE_RE)) {
      if (!SUBSETS.includes(subset) || /font-style:\s*italic/.test(face)) continue
      faces.push(await inlineUrls(face))
    }
  }

  Logger.debug(`🔤[font] embedded ${faces.length} font faces (${[...hrefs].join(' , ')})`)
  for (const face of faces) Logger.trace(`🔤[font] ${face.replace(/url\([^)]*\)/g, 'url(…)').replace(/\s+/g, ' ')}`)
  return faces.join('\n')
}

/** CSS 内の url(...) を data url に置き換える. */
async function inlineUrls(css: string): Promise<string> {
  const urls = [...css.matchAll(/url\((['"]?)(https:[^'")]+)\1\)/g)].map(m => m[2])
  let result = css
  for (const url of new Set(urls)) {
    result = result.replaceAll(url, await fetchDataUrl(url))
  }
  return result
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return await res.text()
}

async function fetchDataUrl(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  const blob = await res.blob()
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
