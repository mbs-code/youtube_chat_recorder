import type VideoData from '../../interface/VideoData'
import { BRIDGE_REQUEST_SOURCE, type BridgeRequest, isBridgeResponse } from '../bridge/protocol'

const VIDEO_ID_PATTERN = /^[\w-]{11}$/

export default class PageHelper {
  /**
   * url から YouTube の動画 ID を取得する.
   *
   * - `/watch?v=<id>` と `/live/<id>` に対応.
   *
   * @param url 対象の url (未指定なら現在のページ)
   */
  public static getPageVideoId(url?: string): string | undefined {
    let uri: URL
    try {
      uri = new URL(url || window.location.href)
    } catch {
      return undefined
    }
    if (!/(^|\.)youtube\.com$/.test(uri.hostname)) return undefined

    const id = uri.pathname === '/watch' ? uri.searchParams.get('v') : uri.pathname.match(/^\/live\/([^/]+)/)?.[1]
    return id && VIDEO_ID_PATTERN.test(id) ? id : undefined
  }

  /**
   * MAIN world の page-bridge に問い合わせて、現在の動画情報を取得する.
   *
   * @param videoId この動画のデータのみ受け付ける
   * @param timeout 応答待ち時間 (msec)
   * @return 動画情報 (未取得・タイムアウトなら null)
   */
  public static requestVideoData(videoId?: string, timeout = 1000): Promise<VideoData | null> {
    return new Promise(resolve => {
      const requestId = crypto.randomUUID()

      const finish = (data: VideoData | null) => {
        window.removeEventListener('message', onMessage)
        clearTimeout(timer)
        resolve(data)
      }
      const onMessage = (event: MessageEvent) => {
        if (event.source === window && isBridgeResponse(event.data) && event.data.requestId === requestId) {
          finish(event.data.data)
        }
      }
      const timer = setTimeout(() => finish(null), timeout)
      window.addEventListener('message', onMessage)

      const request: BridgeRequest = { source: BRIDGE_REQUEST_SOURCE, type: 'YCR_GET_VIDEO_DATA', requestId, videoId }
      window.postMessage(request, window.location.origin)
    })
  }
}
