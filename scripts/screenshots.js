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
      '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="#fda4af"/><stop offset="1" stop-color="#93c5fd"/></linearGradient></defs><rect width="320" height="180" fill="url(#g)"/><text x="160" y="105" font-family="sans-serif" font-size="32" font-weight="bold" fill="#fff" text-anchor="middle">初配信</text></svg>',
    ),
    isBroadcast: true,
    isLiveNow: true,
    startDate: start,
    publishedAt: start,
    updatedAt: now - 60 * 1000,
    maxViewers: 26905,
    maxViewersAt: start + (1 * 3600 + 53 * 60) * 1000 - 60 * 60 * 1000,
    maxViewCount: 46784,
    maxViewCountAt: now - 60 * 1000,
    createdAt: start,
  },
  {
    id: 'sample00002',
    title: '【歌枠】リクエストに応えて歌います！',
    channelName: '△△ch',
    thumbnailUrl: svgDataUrl(
      '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#c4b5fd"/></svg>',
    ),
    isBroadcast: true,
    startDate: start - 86400000,
    endDate: start - 86400000 + 7200000,
    updatedAt: now - 86400000,
  },
]

/** 配信の推移 (60 分). 同接はゆるやかに増え、コメントは盛り上がりで増える. */
const TIMELINE = Array.from({ length: 60 }, (_, i) => {
  const t = Math.floor(start / 60000) * 60000 + i * 60000
  const viewers = Math.round(18000 + 9000 * Math.sin(i / 19) + (i > 40 && i < 46 ? 1500 : 0) + ((i * 37) % 11) * 60)
  const comments = Math.round(120 + 80 * Math.abs(Math.sin(i / 5)) + (i > 40 && i < 46 ? 260 : 0) + ((i * 53) % 17) * 4)
  return i === 22 ? { t, comments } : { t, viewers, comments } // 22 分目は同接が読めなかった
})

/** 再生数の記録 (配信中は 1 分ごと, その後は開き直した時). */
const VIEW_COUNTS = [
  ...TIMELINE.filter((_, i) => i % 3 === 0).map((p, i) => ({ t: p.t, views: 12000 + i * 1700 })),
  { t: TIMELINE.at(-1).t + 3 * 3600 * 1000, views: 61200 },
]

const CHATS = [
  { authorName: '@〇〇ちゃんねる', altMessage: 'みなさんこんにちは～！', isOwner: true, isVerified: true, image: '#fda4af' },
  { authorName: '@moderator_san', altMessage: 'こんにちは！今日もよろしくお願いします', isModerator: true, image: '#93c5fd' },
  { authorName: '@fan_one', altMessage: '初配信おめでとうございます！', isSuperChat: true, money: 1000, moneyUnit: '￥', superCount: 5, image: '#fcd34d' },
  {
    authorName: '@member_two',
    altMessage: 'ずっと応援してます',
    isMember: true,
    isMilestone: true,
    memberMonths: 12,
    milestoneText: 'メンバー歴 12 か月',
  },
  { authorName: '@newcomer', altMessage: 'メンバーシップへようこそ！', isMember: true, isJoinMember: true },
  { authorName: '@viewer_three', altMessage: '初見です！', topChatRank: 1, image: '#86efac' },
  { authorName: '@overseas_fan', altMessage: 'Congrats!', isSuperChat: true, money: 5, moneyUnit: '$' },
  { authorName: '@tw_fan', altMessage: '恭喜！', isSuperChat: true, money: 150, moneyUnit: 'NT$' },
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
    await worker.evaluate(data => chrome.storage.local.set(data), { '@videos': VIDEOS, 'sample00001': CHATS, '@timeline:sample00001': TIMELINE, '@views:sample00001': VIEW_COUNTS })

    const popup = await context.newPage()
    await popup.setViewportSize({ width: 600, height: 600 })
    await popup.goto(`chrome-extension://${extensionId}/popup/popup.html`)
    await popup.waitForTimeout(800)
    await popup.screenshot({ path: path.join(RESULTS, 'screenshot-popup.png') })
    await popup.screenshot({ path: path.join(RESULTS, 'screenshot-popup-full.png'), fullPage: true })
    // 絞り込みの一覧 (件数のバッジ付き)
    await popup.click('[aria-label="表示するチャット"]')
    await popup.screenshot({ path: path.join(RESULTS, 'screenshot-popup-filter.png') })
    // 複数選んだ状態 (2 つ目と 3 つ目)
    await popup.locator('[role="option"]').nth(1).click()
    await popup.locator('[role="option"]').nth(2).click()
    await popup.screenshot({ path: path.join(RESULTS, 'screenshot-popup-filter-multi.png') })
    await popup.locator('[role="option"]').first().click()
    await popup.keyboard.press('Escape')

    // 記録・グラフのタブ (グラフにマウスを乗せた状態)
    await popup.click('[role="tab"]:has-text("記録・グラフ")')
    await popup.waitForTimeout(300)
    await popup.screenshot({ path: path.join(RESULTS, 'screenshot-popup-stats.png') })
    const chart = popup.locator('section.card').filter({ has: popup.locator('svg') }).first()
    const chartSvg = chart.locator('svg').last()
    const box = await chartSvg.boundingBox()
    if (box) await popup.mouse.move(box.x + box.width * 0.72, box.y + box.height / 2)
    await chart.screenshot({ path: path.join(RESULTS, 'screenshot-popup-timeline.png') })
    const views = popup.locator('section.card').filter({ has: popup.locator('svg') }).nth(1)
    const viewsBox = await views.locator('svg').boundingBox()
    if (viewsBox) await popup.mouse.move(viewsBox.x + viewsBox.width * 0.4, viewsBox.y + viewsBox.height / 2)
    await views.screenshot({ path: path.join(RESULTS, 'screenshot-popup-views.png') })
    await popup.mouse.move(0, 0)
    await popup.screenshot({ path: path.join(RESULTS, 'screenshot-popup-stats-full.png'), fullPage: true })
    await popup.click('[role="tab"]:has-text("チャット")')
    await popup.waitForTimeout(300)

    await popup.click('.chat >> nth=0')
    await popup.click('.chat >> nth=2')
    await popup.screenshot({ path: path.join(RESULTS, 'screenshot-popup-selected.png') })

    // CSV のダウンロード (選択した 2 件)
    const [download] = await Promise.all([popup.waitForEvent('download'), popup.click('button:has-text("CSV で保存")')])
    await download.saveAs(path.join(RESULTS, 'sample.csv'))
    console.log(`csv: ${download.suggestedFilename()}`)

    // 画像をつなげて保存 (選択した 2 件). 2 回目は「独自のデザインで画像化」(popup の要素を画像化する) で確認する
    const [merged] = await Promise.all([popup.waitForEvent('download'), popup.click('button:has-text("画像をつなげて保存")')])
    await merged.saveAs(path.join(RESULTS, 'sample-merged.png'))
    await worker.evaluate(() => chrome.storage.local.set({ '@config': { generateOriginalImage: true } }))
    await popup.reload()
    await popup.waitForTimeout(800)
    await popup.click('.chat >> nth=0')
    await popup.click('.chat >> nth=2')
    const [original] = await Promise.all([popup.waitForEvent('download'), popup.click('button:has-text("画像をつなげて保存")')])
    await original.saveAs(path.join(RESULTS, 'sample-merged-original.png'))
    await worker.evaluate(() => chrome.storage.local.remove('@config'))
    console.log('merged images: sample-merged.png, sample-merged-original.png')

    // 並び順の切り替え (新しい順)
    await popup.click('button:has-text("古い順")')
    await popup.evaluate(() => window.scrollTo(0, 0))
    await popup.screenshot({ path: path.join(RESULTS, 'screenshot-popup-desc.png') })
    await popup.click('button:has-text("新しい順")')

    await popup.click('.trigger')
    await popup.waitForTimeout(300)
    await popup.screenshot({ path: path.join(RESULTS, 'screenshot-popup-dropdown.png') })

    const options = await context.newPage()
    await options.setViewportSize({ width: 1280, height: 900 })
    await options.goto(`chrome-extension://${extensionId}/options/options.html`)
    await options.waitForTimeout(800)
    await options.screenshot({ path: path.join(RESULTS, 'screenshot-options.png'), fullPage: true })

    // データの管理: 全てのチャットを CSV で出力
    const [allCsv] = await Promise.all([options.waitForEvent('download'), options.click('button:has-text("CSV で出力")')])
    await allCsv.saveAs(path.join(RESULTS, 'sample-all.csv'))
    console.log(`csv (all): ${allCsv.suggestedFilename()}`)
    await options.locator('text=データの管理').scrollIntoViewIfNeeded()
    await options.screenshot({ path: path.join(RESULTS, 'screenshot-options-data.png') })

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

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
