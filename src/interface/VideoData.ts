/**
 * YouTube の playerResponse から抜き出した動画情報.
 *
 * MAIN world (page-bridge) -> isolated world (content-script) に postMessage で渡すため、
 * structured clone できるプレーンな値のみで構成すること.
 */
export default interface VideoData {
  videoId: string
  title?: string
  author?: string
  channelId?: string
  lengthSeconds?: number
  viewCount?: number
  thumbnails: { url: string, width?: number, height?: number }[]

  isLive: boolean // 配信中
  isUpcoming: boolean // 配信予定
  isLiveContent: boolean // ライブ配信 (アーカイブ含む)

  liveBroadcastDetails?: {
    isLiveNow?: boolean
    startTimestamp?: string // 2026-11-21T23:33:15+00:00
    endTimestamp?: string
  }

  publishDate?: string // 2026-11-21T15:24:48-08:00
  uploadDate?: string
}
