import { parseISO } from 'date-fns'
import VideoObjectInterface from '../../interface/VideoObjectInterface'
import Video from '../../models/Video'

const THUMBNAIL_TYPES = ['maxres', 'standard', 'high', 'medium', 'default']

export default class VideoParser {
  public static async parse(json: VideoObjectInterface): Promise<Video> {
    const video = new Video()
    video.id = json.videoId

    video.title = json.name
    // video.description = json.description
    video.thumbnailUrl = this.parseThumbnails(json.thumbnailUrl)

    /// 統計系 ///
    video.viewCount = json.interactionCount

    /// 配信系 ///
    const pubs = json.publication
    if (pubs) {
      for (const pub of pubs) {
        const type = pub['@type']
        if (type === 'BroadcastEvent') {
          video.isBroadcast = true
          video.isLive = Boolean(pub.startDate && !pub.endDate)
          if (pub.startDate) video.actualStartDate = new Date(pub.startDate)
          if (pub.endDate) video.actualEndDate = new Date(pub.endDate)
        }
      }
    }

    if (json.uploadDate) video.publishedAt = parseISO(json.uploadDate) // 00:00:00

    return video
  }

  /// ////////////////////////////////////////////////////////////

  protected static parseThumbnails(thumbnails: string[] = []): string | undefined {
    for (const THUMBNAIL_TYPE of THUMBNAIL_TYPES) {
      const find = thumbnails.find(u => u.includes(THUMBNAIL_TYPE))
      if (find) return find
    }
    return undefined
  }
}
