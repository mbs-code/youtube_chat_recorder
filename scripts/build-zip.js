#!/usr/bin/env node
/**
 * dist/ を Chrome Web Store 公開用の zip にまとめる.
 * 先に `npm run build` を実行しておくこと (`npm run build-zip` なら自動で実行される).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { zipSync } from 'fflate'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const DIST_ZIP = path.join(ROOT, 'dist-zip')

function collectFiles(dir, base = dir, files = {}) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      collectFiles(fullPath, base, files)
    } else {
      const relPath = path.relative(base, fullPath).split(path.sep).join('/')
      files[relPath] = fs.readFileSync(fullPath)
    }
  }
  return files
}

const { name, version } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
if (!fs.existsSync(path.join(DIST, 'manifest.json'))) {
  console.error('dist/manifest.json not found. Run `npm run build` first.')
  process.exit(1)
}

const zipFilename = `${name}-v${version}.zip`
console.info(`Building ${zipFilename}...`)

fs.mkdirSync(DIST_ZIP, { recursive: true })
const zipped = zipSync(collectFiles(DIST), { level: 9 })
fs.writeFileSync(path.join(DIST_ZIP, zipFilename), zipped)

console.info(`OK: dist-zip/${zipFilename} (${zipped.length.toLocaleString()} bytes)`)
