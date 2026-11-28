import type VideoData from '../../interface/VideoData'

/* eslint-disable @typescript-eslint/no-explicit-any -- YouTube の内部データ構造は型が無いため */

const toNumber = (value: unknown): number | undefined => {
  const num = Number(value)
  return value !== undefined && value !== null && value !== '' && Number.isFinite(num) ? num : undefined
}

const toStr = (value: unknown): string | undefined => (typeof value === 'string' && value ? value : undefined)

/**
 * YouTube の playerResponse (ytInitialPlayerResponse 等) から必要な値だけ取り出す.
 *
 * - MAIN world (page-bridge) で実行される.
 * - 想定外の構造でも例外を投げず undefined を返す.
 *
 * @param playerResponse window.ytInitialPlayerResponse, movie_player.getPlayerResponse() など
 */
export function parsePlayerResponse(playerResponse: unknown): VideoData | undefined {
  const pr = playerResponse as any
  const details = pr?.videoDetails
  const videoId = toStr(details?.videoId)
  if (!videoId) return undefined

  const micro = pr?.microformat?.playerMicroformatRenderer
  const live = micro?.liveBroadcastDetails

  const thumbnails = [...(details?.thumbnail?.thumbnails ?? []), ...(micro?.thumbnail?.thumbnails ?? [])]
    .filter((t: any) => typeof t?.url === 'string')
    .map((t: any) => ({ url: String(t.url), width: toNumber(t.width), height: toNumber(t.height) }))

  return {
    videoId,
    title: toStr(details?.title) ?? toStr(micro?.title?.simpleText),
    author: toStr(details?.author) ?? toStr(micro?.ownerChannelName),
    channelId: toStr(details?.channelId),
    lengthSeconds: toNumber(details?.lengthSeconds),
    viewCount: toNumber(details?.viewCount),
    thumbnails,
    isLive: Boolean(details?.isLive),
    isUpcoming: Boolean(details?.isUpcoming),
    isLiveContent: Boolean(details?.isLiveContent),
    liveBroadcastDetails: live
      ? {
          isLiveNow: Boolean(live.isLiveNow),
          startTimestamp: toStr(live.startTimestamp),
          endTimestamp: toStr(live.endTimestamp),
        }
      : undefined,
    publishDate: toStr(micro?.publishDate),
    uploadDate: toStr(micro?.uploadDate),
  }
}

/**
 * 動画ページのデータ (ytd-watch-flexy.data / ytInitialData) から、配信中の同時接続数を取り出す.
 *
 * - contents.twoColumnWatchNextResults.results.results.contents[].videoPrimaryInfoRenderer.viewCount.videoViewCountRenderer
 *   = { isLive: true, originalViewCount: "369", viewCount: { simpleText: "369 人が視聴中" } }
 * - 配信中でなければ (isLive が無い = 再生数の表示) undefined.
 * - SPA 遷移の途中で別の動画のデータが残っていることがあるので、currentVideoEndpoint の動画 ID を確かめる.
 *
 * @param watchResponse ytd-watch-flexy.data など
 * @param videoId 対象の動画 ID
 */
export function parseConcurrentViewers(watchResponse: unknown, videoId: string): number | undefined {
  const res = watchResponse as any
  const currentId = res?.currentVideoEndpoint?.watchEndpoint?.videoId
  if (currentId !== videoId) return undefined

  const contents: any[] = res?.contents?.twoColumnWatchNextResults?.results?.results?.contents ?? []
  for (const content of contents) {
    const renderer = content?.videoPrimaryInfoRenderer?.viewCount?.videoViewCountRenderer
    if (!renderer?.isLive) continue
    const original = toNumber(renderer.originalViewCount)
    if (original !== undefined) return original
    const digits = toStr(renderer.viewCount?.simpleText)?.replace(/\D/g, '')
    if (digits) return Number(digits)
  }
  return undefined
}

/** 表示の文字から数だけ取り出す ("1,234" → 1234). 万・K などの省略表記は桁が分からないので無視する. */
function parseCount(text: string): number | undefined {
  const match = /\d[\d,]*(?:\.\d+)?/.exec(text)
  if (!match) return undefined
  const rest = text.slice(match.index + match[0].length)
  if (/^\s?[万千億KMB]/i.test(rest)) return undefined
  return Number(match[0].replace(/,/g, ''))
}

/** JSON を深さ優先で調べ、条件に合う値を最初に返す. (調べる個数に上限を付ける) */
function findDeep<T>(root: unknown, pick: (key: string, value: unknown) => T | undefined, maxNodes = 20000): T | undefined {
  const stack: unknown[] = [root]
  let visited = 0
  while (stack.length && visited++ < maxNodes) {
    const node = stack.pop() as any
    if (!node || typeof node !== 'object') continue
    for (const key of Object.keys(node)) {
      const found = pick(key, node[key])
      if (found !== undefined) return found
      if (node[key] && typeof node[key] === 'object') stack.push(node[key])
    }
  }
  return undefined
}

/**
 * 高評価の表示 ("他の 1,234 人がこの動画を高評価しています" / "like this video along with 1,234 other people") から数を取り出す.
 * 数が無い ("この動画を高評価") なら undefined.
 */
export function parseLikeCount(text?: string | null): number | undefined {
  if (!text || !/高評価|高く評価|like this video/i.test(text)) return undefined
  return parseCount(text)
}

/** コメント数の表示 ("1,234 件のコメント" / "1,234 Comments") から数を取り出す. */
export function parseCommentCount(text?: string | null): number | undefined {
  return text ? parseCount(text) : undefined
}

/**
 * 動画ページのデータから高評価数を取り出す.
 * (like ボタンの viewModel の accessibilityText / title に "他の 〇 人がこの動画を高評価しています" がある)
 */
export function parseLikeCountFromData(watchResponse: unknown, videoId: string): number | undefined {
  const res = watchResponse as any
  if (res?.currentVideoEndpoint?.watchEndpoint?.videoId !== videoId) return undefined
  return findDeep(res?.contents, (key, value) => {
    return (key === 'accessibilityText' || key === 'title') && typeof value === 'string' ? parseLikeCount(value) : undefined
  })
}

/**
 * 動画ページのデータからコメント数を取り出す.
 * (commentsHeaderRenderer の countText.runs[0].text や、コメント欄の engagementPanel の contextualInfo.runs[0].text)
 */
export function parseCommentCountFromData(watchResponse: unknown, videoId: string): number | undefined {
  const res = watchResponse as any
  if (res?.currentVideoEndpoint?.watchEndpoint?.videoId !== videoId) return undefined
  const fromRuns = (runs: any): number | undefined =>
    Array.isArray(runs) ? parseCommentCount(runs.map((r: any) => r?.text ?? '').join('')) : undefined
  for (const root of [res?.contents, res?.engagementPanels]) {
    const found = findDeep(root, (key, value) => {
      const v = value as any
      if (key === 'commentsHeaderRenderer') return fromRuns(v?.countText?.runs) ?? parseCommentCount(v?.countText?.simpleText)
      if (key === 'contextualInfo') return fromRuns(v?.runs)
      return undefined
    })
    if (found !== undefined) return found
  }
  return undefined
}
