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

  /**
   * 「〇人が視聴中」の表示から同時接続数を取り出す. (配信中の動画ページの #view-count の aria-label)
   *
   * - "26,905 人が視聴中", "26,905 watching now", "5.357 Zuschauer" (言語によって書き方が違うので、数字だけ取る).
   * - 再生数 ("123 回視聴", "123 views") なら undefined.
   */
  public static parseConcurrentViewers(text?: string | null): number | undefined {
    if (!text || /回視聴|views?\b/i.test(text)) return undefined
    const digits = text.match(/\d[\d,.\s\u00a0\u202f]*/)?.[0].replace(/\D/g, '')
    return digits ? parseInt(digits, 10) : undefined
  }

  /**
   * 回転して数字が変わる表示 (yt-animated-rolling-number) の文字を読む.
   *
   * - 1 文字ごとに `animated-rolling-character` があり、中に " 1 2 … 9 0 1 … 0 1 … 9 " の縦の列が入っている.
   * - `margin-top` で列をずらして 1 文字だけ見せているので、ずらした量 ÷ 1 行の高さ が表示中の行になる.
   *   (例: margin-top: -500px, 高さ 20px → 25 行目 = "5")
   *
   * @param host yt-animated-rolling-number (または中の .animatedRollingNumberDigits)
   * @return "5,357" のような表示中の文字列. 読めなければ undefined
   */
  public static readRollingNumber(host: Element): string | undefined {
    const view = host.ownerDocument.defaultView
    if (!view) return undefined

    let text = ''
    for (const char of Array.from(host.querySelectorAll('animated-rolling-character'))) {
      // YouTube は inline style で margin-top を付けている (無ければ計算後の値)
      const marginTop = parseFloat((char as HTMLElement).style?.marginTop || view.getComputedStyle(char).marginTop) || 0
      // 1 行の高さ: 実際の描画サイズ → 親の line-height → 既定の 20px
      const rowHeight
        = char.firstElementChild?.getBoundingClientRect().height
          || parseFloat(view.getComputedStyle(host).lineHeight)
          || 20
      const row = char.children[Math.round(-marginTop / rowHeight)]
      text += row?.textContent?.replace(/[\s\u00a0]/g, '') ?? ''
    }
    return text || undefined
  }

  /** 一番大きいサムネイルを選ぶ. */
  protected static pickThumbnail(thumbnails: VideoData['thumbnails']): string | undefined {
    const sorted = [...thumbnails].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))
    return sorted[0]?.url
  }
}
