import * as delay from 'delay'
import VideoObjectInterface from '../../interface/VideoObjectInterface'

export default class PageHelper {
  /**
   * ページの videoID を取得する.
   *
   * @static
   * @return {string | undefined} youtube video id
   */
  public static getPageVideoId(): string | undefined {
    const url = new URL(window.location.href)
    const videoId = url.searchParams.get('v') || undefined
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
    const script = await this.retry(() => document.querySelector('#scriptTag'))
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

  ///

  /**
   * 値が取得できるまで繰り返す処理.
   *
   * @static
   * @param {() => T | Promise<T>} func 繰り返したい処理
   * @param {number | 10} maxTry 最大実行回数
   * @param {number | 1000} interval 待機時間
   * @return {T | undefined} func() で取得した値, 失敗時は undefined
   */
  protected static async retry<T>(func: () => T | Promise<T>, maxTry = 10, interval = 1000): Promise<T | undefined> {
    for (let i = 0; i < maxTry; i++) {
      const res = await func()
      if (res) return res

      await delay(interval)
    }
    return undefined
  }
}
