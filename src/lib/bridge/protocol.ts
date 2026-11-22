import type VideoData from '../../interface/VideoData'

/**
 * isolated world (content-script) <-> MAIN world (page-bridge) の window.postMessage プロトコル.
 *
 * content script (isolated world) からはページの JS オブジェクト (ytInitialPlayerResponse 等) が見えないため、
 * MAIN world で動く page-bridge に問い合わせる.
 */
export const BRIDGE_REQUEST_SOURCE = 'ycr:content'
export const BRIDGE_RESPONSE_SOURCE = 'ycr:bridge'

export interface BridgeRequest {
  source: typeof BRIDGE_REQUEST_SOURCE
  type: 'YCR_GET_VIDEO_DATA'
  requestId: string
  videoId?: string // 一致する動画のデータのみ返す (SPA 遷移直後の古いデータを避ける)
}

export interface BridgeResponse {
  source: typeof BRIDGE_RESPONSE_SOURCE
  type: 'YCR_VIDEO_DATA'
  requestId: string
  data: VideoData | null
}

export function isBridgeRequest(data: unknown): data is BridgeRequest {
  const d = data as BridgeRequest | null
  return d?.source === BRIDGE_REQUEST_SOURCE && d.type === 'YCR_GET_VIDEO_DATA' && typeof d.requestId === 'string'
}

export function isBridgeResponse(data: unknown): data is BridgeResponse {
  const d = data as BridgeResponse | null
  return d?.source === BRIDGE_RESPONSE_SOURCE && d.type === 'YCR_VIDEO_DATA' && typeof d.requestId === 'string'
}
