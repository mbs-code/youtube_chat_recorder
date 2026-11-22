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
