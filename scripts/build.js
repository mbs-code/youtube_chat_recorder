#!/usr/bin/env node
/**
 * Chrome 拡張機能 (MV3) のビルドスクリプト.
 *
 * Vite を 3 回呼び出して dist/ を組み立てる:
 *   1. popup / options (HTML) + background (Service Worker, ES module)
 *   2. content-script.js (isolated world, IIFE)
 *   3. page-bridge.js    (MAIN world, IIFE)
 *
 * content script は ES module を読み込めないため、単一ファイルの IIFE で出力する必要がある.
 *
 * usage: node scripts/build.js [--mode development] [--watch]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { marked } from 'marked'
import { build } from 'vite'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const DIST = path.join(ROOT, 'dist')
const DOCS = path.join(ROOT, 'docs')

const { values: args } = parseArgs({
  options: {
    mode: { type: 'string', default: 'production' },
    watch: { type: 'boolean', default: false },
  },
})
const mode = args.mode
const isDev = mode === 'development'

const CONTENT_SCRIPTS = [
  { entry: 'content-scripts/content-script.ts', fileName: 'content-script.js' },
  { entry: 'content-scripts/page-bridge.ts', fileName: 'page-bridge.js' },
]

/** 全ビルドで共通の設定. */
function baseConfig() {
  return {
    configFile: false,
    root: SRC,
    mode,
    envDir: ROOT,
    // VUE_APP_ は旧 (vue-cli) 時代の .env 互換のため残している
    envPrefix: ['VITE_', 'VUE_APP_'],
    logLevel: 'warn',
    build: {
      outDir: DIST,
      emptyOutDir: false, // dist の削除はこのスクリプトで行う (watch 時に他のビルド結果を消さないため)
      target: 'chrome120',
      minify: !isDev,
      sourcemap: isDev ? 'inline' : false,
      watch: args.watch ? {} : null,
    },
  }
}

/** manifest.json と readme を dist に出力する Vite プラグイン. */
function extensionAssetsPlugin() {
  return {
    name: 'ycr-extension-assets',
    buildStart() {
      this.addWatchFile(path.join(SRC, 'manifest.json'))
      this.addWatchFile(path.join(DOCS, 'readme.md'))
    },
    generateBundle() {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
      const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'))
      manifest.version = pkg.version
      this.emitFile({ type: 'asset', fileName: 'manifest.json', source: JSON.stringify(manifest, null, 2) })

      const markdown = fs.readFileSync(path.join(DOCS, 'readme.md'), 'utf8')
      this.emitFile({ type: 'asset', fileName: 'readme/index.html', source: readmeHtml(marked.parse(markdown)) })
      for (const name of fs.readdirSync(path.join(DOCS, 'assets'))) {
        this.emitFile({ type: 'asset', fileName: `readme/assets/${name}`, source: fs.readFileSync(path.join(DOCS, 'assets', name)) })
      }
    },
  }
}

/** GitHub と同じ規則で見出しの id を作る (readme の目次リンクを GitHub と拡張機能の両方で動かすため). */
function headingSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-')
}

marked.use({
  renderer: {
    heading({ tokens, depth, text }) {
      return `<h${depth} id="${headingSlug(text)}">${this.parser.parseInline(tokens)}</h${depth}>\n`
    },
  },
})

function readmeHtml(body) {
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Youtube Chat Recorder - 使い方</title>
  <link rel="stylesheet" href="./assets/style.css">
  <link rel="stylesheet" href="./assets/readme.css">
</head>
<body>
${body}
</body>
</html>
`
}

/** popup / options / background のビルド. */
function pagesConfig() {
  const base = baseConfig()
  return {
    ...base,
    base: './',
    publicDir: path.join(ROOT, 'public'),
    plugins: [vue(), tailwindcss(), extensionAssetsPlugin()],
    build: {
      ...base.build,
      rollupOptions: {
        input: {
          popup: path.join(SRC, 'popup/popup.html'),
          options: path.join(SRC, 'options/options.html'),
          background: path.join(SRC, 'backgrounds/background.ts'),
        },
        output: {
          // manifest から参照するため background だけはファイル名を固定する
          entryFileNames: chunk => (chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js'),
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  }
}

/** content script (IIFE) のビルド. */
function contentScriptConfig({ entry, fileName }) {
  const base = baseConfig()
  return {
    ...base,
    publicDir: false,
    define: {
      // lib モードでは自動で置換されないため明示する
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    build: {
      ...base.build,
      lib: {
        entry: path.join(SRC, entry),
        formats: ['iife'],
        name: 'ycr_' + path.basename(fileName, '.js').replace(/\W/g, '_'),
        fileName: () => fileName,
      },
    },
  }
}

async function main() {
  fs.rmSync(DIST, { recursive: true, force: true })

  const started = Date.now()
  await build(pagesConfig())
  for (const script of CONTENT_SCRIPTS) {
    await build(contentScriptConfig(script))
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1)
  if (args.watch) {
    console.info(`[ycr] watching... (mode: ${mode}) -> ${path.relative(ROOT, DIST)}`)
  } else {
    console.info(`[ycr] built in ${elapsed}s (mode: ${mode}) -> ${path.relative(ROOT, DIST)}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
