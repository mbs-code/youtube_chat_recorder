#!/usr/bin/env node
/**
 * 実際の YouTube で拡張機能が動くかを確認する E2E スクリプト.
 *
 * dist/ を読み込んだ Chromium (Playwright) で動画ページを開き、
 * 一定時間後に chrome.storage に保存された動画・チャットを集計して表示する.
 * YouTube の DOM が変わって動かなくなった時の調査用.
 *
 * usage:
 *   npm run build
 *   npm run e2e -- [url] [--wait 60] [--headed] [--screenshot]
 *
 *   url を省略すると、ライブ配信を検索して最初に見つかったものを開く.
 *   --screenshot で test-results/ に YouTube・popup・options のスクリーンショットを保存する.
 *
 * 初回のみ: npx playwright install chromium
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const RESULTS = path.join(ROOT, 'test-results')

// headless の UA (HeadlessChrome) だと YouTube のチャットが「ブラウザが古い」と表示されないため通常の UA にする
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    wait: { type: 'string', default: '60' },
    headed: { type: 'boolean', default: false },
    screenshot: { type: 'boolean', default: false },
    search: { type: 'string', default: '雑談' },
  },
})

/** E2E 用の設定: 全チャットを保存し、一部を画像化する. */
const E2E_CONFIG = {
  chatFilters: [
    { key: 'plain', title: '⬜ 通常チャット', doSave: true, doImage: false },
    { key: 'owner', title: '🟨 チャンネルの所有者', doSave: true, doImage: true },
    { key: 'verified', title: '✅ 確認済み(登録10万)', doSave: true, doImage: true },
    { key: 'moderator', title: '🔧 モデレーター', doSave: true, doImage: true },
    { key: 'superchat', title: '💰 スーパーチャット', doSave: true, doImage: true },
    { key: 'member', title: '🟩 メンバー', doSave: true, doImage: true },
    { key: 'joinmember', title: '➕ メンバー加入', doSave: true, doImage: true },
    { key: 'milestone', title: '🎉 メンバー歴', doSave: true, doImage: true },
  ],
  showLogLevel: 'debug',
}

async function findLiveUrl(page) {
  const query = encodeURIComponent(args.search)
  await page.goto(`https://www.youtube.com/results?search_query=${query}&sp=EgJAAQ%253D%253D`) // フィルタ: ライブ
  await page.waitForSelector('ytd-video-renderer a#thumbnail[href*="watch"]', { timeout: 30_000 })
  const href = await page.$eval('ytd-video-renderer a#thumbnail[href*="watch"]', a => a.href)
  const url = new URL(href)
  return `https://www.youtube.com/watch?v=${url.searchParams.get('v')}`
}

/** チャット iframe 内の要素の数 (YouTube の DOM 変更の検出用). */
async function inspectChatFrame(page) {
  const frame = page.frames().find(f => /\/live_chat/.test(f.url()))
  if (!frame) return { frame: false }
  return await frame.evaluate(() => {
    const count = selector => document.querySelectorAll(selector).length
    return {
      frame: true,
      url: location.pathname,
      itemScroller: count('yt-live-chat-item-list-renderer #item-scroller'),
      textMessage: count('yt-live-chat-text-message-renderer'),
      paidMessage: count('yt-live-chat-paid-message-renderer'),
      membership: count('yt-live-chat-membership-item-renderer'),
      paidSticker: count('yt-live-chat-paid-sticker-renderer'),
      authorName: count('yt-live-chat-text-message-renderer #author-name'),
      message: count('yt-live-chat-text-message-renderer #message'),
      timestamp: count('yt-live-chat-text-message-renderer #timestamp'),
    }
  })
}

async function main() {
  if (!fs.existsSync(path.join(DIST, 'manifest.json'))) {
    throw new Error('dist/manifest.json not found. Run `npm run build` first.')
  }

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ycr-e2e-'))
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium', // 拡張機能は headless shell では動かないため
    headless: !args.headed,
    userAgent: USER_AGENT,
    locale: 'ja-JP',
    viewport: { width: 1400, height: 900 },
    args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`],
  })

  try {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))
    const extensionId = new URL(worker.url()).host
    console.log(`extension: ${extensionId}`)

    await worker.evaluate(config => chrome.storage.local.set({ '@config': config }), E2E_CONFIG)

    const page = await context.newPage()
    const logs = []
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('[YCR]')) logs.push(text.replace(/%c/g, '').replace(/ color: [^ ]+$/, ''))
    })

    const url = positionals[0] ?? (await findLiveUrl(page))
    console.log(`open: ${url}`)
    await page.goto(url, { waitUntil: 'domcontentloaded' })

    const waitSec = Number(args.wait)
    console.log(`waiting ${waitSec}s...`)
    // headless では自動再生されないことがあるので、ミュートして再生し続ける (アーカイブのチャットリプレイは再生しないと流れない)
    for (let elapsed = 0; elapsed < waitSec; elapsed += 5) {
      await page.evaluate(() => {
        const video = document.querySelector('video')
        if (video?.paused) {
          video.muted = true
          video.play().catch(() => {})
        }
      })
      await page.waitForTimeout(Math.min(5, waitSec - elapsed) * 1000)
    }

    const chatFrame = await inspectChatFrame(page)
    const storage = await worker.evaluate(() => chrome.storage.local.get(null))
    const videoId = new URL(page.url()).searchParams.get('v') ?? page.url().match(/\/live\/([\w-]{11})/)?.[1]
    const video = (storage['@videos'] ?? []).find(v => v.id === videoId)
    const chats = storage[videoId] ?? []
    // content script -> background のメッセージでタブのバッジが更新されているか
    const badge = await worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ url: 'https://www.youtube.com/*' })
      return tab?.id === undefined ? null : await chrome.action.getBadgeText({ tabId: tab.id })
    })

    console.log('\n=== chat frame (DOM) ===')
    console.log(chatFrame)

    console.log('\n=== video ===')
    console.log(video ?? '(not saved)')

    console.log('\n=== chats ===')
    const withImage = chats.filter(c => c.pngUrl).length
    const imageErrors = chats.filter(c => c.isImageError).length
    const missingAuthor = chats.filter(c => !c.authorName).length
    const missingTime = chats.filter(c => c.timestamp === undefined).length
    console.log({ total: chats.length, withImage, imageErrors, missingAuthor, missingTime, badge })
    for (const chat of chats.slice(-8)) {
      const time = chat.timestamp ? new Date(chat.timestamp).toLocaleTimeString() : '-'
      const flags = [
        'isOwner',
        'isModerator',
        'isMember',
        'isVerified',
        'isSuperChat',
        'isSuperStickers',
        'isJoinMember',
        'isMilestone',
      ].filter(k => chat[k])
      console.log(`  ${time} (${chat.seconds}s) [${chat.authorName}] ${chat.altMessage} ${flags.join(',')}${chat.pngUrl ? ' 🖼' : ''}`)
    }

    console.log('\n=== logs (last 15) ===')
    console.log(logs.slice(-15).join('\n'))

    if (args.screenshot) {
      fs.mkdirSync(RESULTS, { recursive: true })
      await page.screenshot({ path: path.join(RESULTS, 'youtube.png') })

      const sample = chats.find(c => c.pngUrl)
      if (sample) fs.writeFileSync(path.join(RESULTS, 'chat-image.png'), Buffer.from(sample.pngUrl.split(',')[1], 'base64'))

      const popup = await context.newPage()
      await popup.setViewportSize({ width: 640, height: 820 })
      await popup.goto(`chrome-extension://${extensionId}/popup/popup.html`)
      await popup.waitForTimeout(1000)
      // popup は開いているタブの動画を初期選択するが、別タブで開いているので先頭の動画を選ぶ
      await popup.click('.dropdown-trigger button')
      await popup.click('.dropdown-item')
      await popup.waitForTimeout(1000)
      await popup.screenshot({ path: path.join(RESULTS, 'popup.png') })

      const options = await context.newPage()
      await options.goto(`chrome-extension://${extensionId}/options/options.html`)
      await options.waitForTimeout(1000)
      await options.screenshot({ path: path.join(RESULTS, 'options.png'), fullPage: true })
      console.log(`\nscreenshots: ${path.relative(ROOT, RESULTS)}/`)
    }

    // 判定: 動画が保存され、(チャット欄があれば) 監視を開始できていること
    const observing = logs.some(log => log.includes('[start] observe chat'))
    const problems = []
    if (!video) problems.push('video is not saved (page-bridge / playerResponse?)')
    if (video?.isBroadcast && chatFrame.frame && !observing) problems.push('chat observer did not start (iframe / #item-scroller?)')
    if (chats.length > 0 && missingAuthor + missingTime > 0) problems.push('some chats lack author/timestamp (ChatParser selectors?)')

    if (problems.length > 0) {
      console.log(`\nRESULT: NG\n- ${problems.join('\n- ')}`)
      process.exitCode = 1
    } else if (video?.isBroadcast && chats.length === 0) {
      console.log('\nRESULT: OK (warning: no chats captured. the stream may be quiet; try a busier one or a longer --wait)')
    } else {
      console.log('\nRESULT: OK')
    }
  } finally {
    await context.close()
    fs.rmSync(userDataDir, { recursive: true, force: true })
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
