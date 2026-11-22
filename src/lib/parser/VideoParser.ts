import type VideoData from '../../interface/VideoData'
import Video from '../../models/Video'
import { toDate } from '../util/serialize'

/** page-bridge から受け取った動画情報 (VideoData) を Video に変換する. */
export default class VideoParser {
  public static parse(data: VideoData): Video {
    const video = new Video()
    video.id = data.videoId
    video.title = data.title
    video.channelName = data.author
    video.thumbnailUrl = this.pickThumbnail(data.thumbnails)

    video.duration = data.lengthSeconds ?? 0 // 配信中は 0
    video.viewCount = data.viewCount ?? 0

    // ライブ配信 (配信中・配信予定・アーカイブ) なら liveBroadcastDetails がある
    const live = data.liveBroadcastDetails
    video.isBroadcast = data.isLiveContent || data.isUpcoming || Boolean(live)
    video.isLiveNow = data.isLive || Boolean(live?.isLiveNow)
    video.isUpcoming = data.isUpcoming
    video.startDate = toDate(live?.startTimestamp) // 配信予定なら予定時刻
    video.endDate = toDate(live?.endTimestamp) // 配信中は無い
    video.publishedAt = toDate(data.publishDate ?? data.uploadDate)

    return video
  }

  /** 一番大きいサムネイルを選ぶ. */
  protected static pickThumbnail(thumbnails: VideoData['thumbnails']): string | undefined {
    const sorted = [...thumbnails].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))
    return sorted[0]?.url
  }
}
