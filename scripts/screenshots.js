#!/usr/bin/env node
/**
 * 架空のサンプルデータを入れた状態で popup / options のスクリーンショットを撮る.
 * (YouTube には接続しない. UI の確認や、使い方ページの画像の作成に使う)
 *
 * usage:
 *   npm run build
 *   npm run screenshots   -> test-results/screenshot-*.png
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const RESULTS = path.join(ROOT, 'test-results')

const svgDataUrl = svg => 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64')

/** チャット欄の画像の代わり. */
function chatImage(author, message, color) {
  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="380" height="32">
    <rect width="380" height="32" fill="#fff"/>
    <circle cx="36" cy="16" r="12" fill="${color}"/>
    <text x="56" y="21" font-family="sans-serif" font-size="13" fill="#2ba640">${author}</text>
    <text x="${64 + author.length * 8}" y="21" font-family="sans-serif" font-size="13" fill="#0f0f0f">${message}</text>
  </svg>`)
}

const now = Date.now()
const start = now - 60 * 60 * 1000

const VIDEOS = [
  {
    id: 'sample00001',
    title: '【初配信】はじめまして！〇〇ちゃんねるです【雑談】',
    channelName: '〇〇ちゃんねる',
    thumbnailUrl: svgDataUrl(
      '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="#fda4af"/><stop offset="1" stop-color="#93c5fd"/></linearGradient></defs><rect width="320" height="180" fill="url(#g)"/><text x="160" y="105" font-family="sans-serif" font-size="32" font-weight="bold" fill="#fff" text-anchor="middle">初配信</text></svg>'
    ),
    isBroadcast: true,
    isLiveNow: true,
    startDate: start,
    publishedAt: start,
    updatedAt: now - 60 * 1000,
    createdAt: start,
  },
  {
    id: 'sample00002',
    title: '【歌枠】リクエストに応えて歌います！',
    channelName: '△△ch',
    thumbnailUrl: svgDataUrl(
      '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#c4b5fd"/></svg>'
    ),
    isBroadcast: true,
    startDate: start - 86400000,
    endDate: start - 86400000 + 7200000,
    updatedAt: now - 86400000,
  },
]

const CHATS = [
  { authorName: '@〇〇ちゃんねる', altMessage: 'みなさんこんにちは～！', isOwner: true, isVerified: true, image: '#fda4af' },
  { authorName: '@moderator_san', altMessage: 'こんにちは！今日もよろしくお願いします', isModerator: true, image: '#93c5fd' },
  { authorName: '@fan_one', altMessage: '初配信おめでとうございます！', isSuperChat: true, money: 1000, moneyUnit: '￥', image: '#fcd34d' },
  {
    authorName: '@member_two',
    altMessage: 'ずっと応援してます',
    isMember: true,
    isMilestone: true,
    memberMonths: 12,
    milestoneText: 'メンバー歴 12 か月',
  },
  { authorName: '@newcomer', altMessage: 'メンバーシップへようこそ！', isMember: true, isJoinMember: true },
  { authorName: '@viewer_three', altMessage: '初見です！', image: '#86efac' },
].map((chat, i) => {
  const { image, ...rest } = chat
  const seconds = 15 + i * 37
  return {
    id: `chat${i}`,
    ...rest,
    seconds,
    timestamp: start + seconds * 1000,
    pngUrl: image ? chatImage(chat.authorName, chat.altMessage, image) : undefined,
  }
})

async function main() {
  if (!fs.existsSync(path.join(DIST, 'manifest.json'))) {
    throw new Error('dist/manifest.json not found. Run `npm run build` first.')
  }
  fs.mkdirSync(RESULTS, { recursive: true })

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ycr-shot-'))
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: true,
    locale: 'ja-JP',
    deviceScaleFactor: 2,
    args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`],
  })

  try {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))
    const extensionId = new URL(worker.url()).host
    await worker.evaluate(data => chrome.storage.local.set(data), { '@videos': VIDEOS, sample00001: CHATS })

    const popup = await context.newPage()
    await popup.setViewportSize({ width: 600, height: 600 })
    await popup.goto(`chrome-extension://${extensionId}/popup/popup.html`)
    await popup.waitForTimeout(800)
    await popup.screenshot({ path: path.join(RESULTS, 'screenshot-popup.png') })

    await popup.click('.chat >> nth=0')
    await popup.click('.chat >> nth=2')
    await popup.screenshot({ path: path.join(RESULTS, 'screenshot-popup-selected.png') })

    await popup.click('.trigger')
    await popup.waitForTimeout(300)
    await popup.screenshot({ path: path.join(RESULTS, 'screenshot-popup-dropdown.png') })

    const options = await context.newPage()
    await options.setViewportSize({ width: 1280, height: 900 })
    await options.goto(`chrome-extension://${extensionId}/options/options.html`)
    await options.waitForTimeout(800)
    await options.screenshot({ path: path.join(RESULTS, 'screenshot-options.png'), fullPage: true })

    // 変更ありの状態 (保存バー)
    await options.fill('input[placeholder^="例:"]', '@viewer_three')
    await options.click('button:text-is("追加")')
    await options.waitForTimeout(300)
    await options.screenshot({ path: path.join(RESULTS, 'screenshot-options-dirty.png') })

    console.log(`screenshots: ${path.relative(ROOT, RESULTS)}/screenshot-*.png`)
  } finally {
    await context.close()
    fs.rmSync(userDataDir, { recursive: true, force: true })
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
