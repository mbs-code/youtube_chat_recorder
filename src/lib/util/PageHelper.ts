import VideoObjectInterface from '../../interface/VideoObjectInterface'
import retry from './Retry'

export default class PageHelper {
  /**
   * ページの videoID を取得する.
   *
   * @static
   * @param {string} [url] 対象の url
   * @return {string | undefined} youtube video id
   */
  public static getPageVideoId(url?: string): string | undefined {
    const uri = new URL(url || window.location.href)
    const videoId = uri.searchParams.get('v') || undefined
    return videoId
  }

  /**
   * ページの videoData を取得する.
   *
   * @static
   * @return {VideoObjectInterface | undefined} youtube video data
   */
  public static async getVideoData(): Promise<VideoObjectInterface | undefined> {
    // notice: ytInitialData は毎回更新がかからないので使えない
    const script = await retry(() => document.querySelector('#scriptTag'))
    if (script) {
      const text = script.textContent
      if (text) {
        const json: VideoObjectInterface = JSON.parse(text)

        // 親要素から video-id を取り出して追加する
        const parent = script.closest('ytd-watch-flexy')
        if (parent) {
          const videoId = parent.getAttribute('video-id') || undefined
          json.videoId = videoId
        }

        return json
      }
    }
    return undefined
  }
}
