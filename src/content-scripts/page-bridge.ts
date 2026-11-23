/**
 * MAIN world で動くブリッジ.
 *
 * - chrome.* API は使えない. ページの JS オブジェクトにアクセスできる.
 * - content-script から postMessage で依頼を受け、現在の動画情報を返すだけ (それ以外はしない).
 */
import { BRIDGE_RESPONSE_SOURCE, type BridgeResponse, isBridgeRequest } from '../lib/bridge/protocol'
import { parseConcurrentViewers, parsePlayerResponse } from '../lib/parser/PlayerResponseParser'
import type VideoData from '../interface/VideoData'

/* eslint-disable @typescript-eslint/no-explicit-any -- YouTube の内部オブジェクトは型が無いため */

/** playerResponse の候補 (新しい順). SPA 遷移後は ytInitialPlayerResponse が古いままなので最後に見る. */
function playerResponseCandidates(): unknown[] {
  const candidates: unknown[] = []
  try {
    const player = document.getElementById('movie_player') as any
    candidates.push(player?.getPlayerResponse?.())
  } catch {
    // ignore
  }
  candidates.push((document.querySelector('ytd-watch-flexy') as any)?.playerData)
  candidates.push((window as any).ytInitialPlayerResponse)
  return candidates
}

/** 動画ページのデータの候補 (新しい順). ytInitialData は SPA 遷移後は古いままなので最後に見る. */
function watchResponseCandidates(): unknown[] {
  return [
    (document.querySelector('ytd-watch-flexy') as any)?.data,
    (document.querySelector('ytd-app') as any)?.data?.response,
    (window as any).ytInitialData,
  ]
}

function findVideoData(videoId?: string): VideoData | null {
  for (const candidate of playerResponseCandidates()) {
    const data = parsePlayerResponse(candidate)
    if (data && (!videoId || data.videoId === videoId)) {
      // 開いた時点の同時接続数 (配信中のみ)
      for (const response of watchResponseCandidates()) {
        data.concurrentViewers = parseConcurrentViewers(response, data.videoId)
        if (data.concurrentViewers !== undefined) break
      }
      return data
    }
  }
  return null
}

window.addEventListener('message', (event) => {
  if (event.source !== window || !isBridgeRequest(event.data)) return

  const response: BridgeResponse = {
    source: BRIDGE_RESPONSE_SOURCE,
    type: 'YCR_VIDEO_DATA',
    requestId: event.data.requestId,
    data: findVideoData(event.data.videoId),
  }
  window.postMessage(response, window.location.origin)
})
