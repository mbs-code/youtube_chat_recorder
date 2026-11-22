import TimelineStorage from '../lib/chrome/storage/TimelineStorage'
import Logger from '../loggers/Logger'
import type Chat from '../models/Chat'
import { MINUTE, TimelineBuffer } from '../models/Timeline'

/** storage に書き込む間隔 (msec). */
const FLUSH_INTERVAL = 10 * 1000
/** 記録を始めてから最初に書き込むまで (msec). 開いてすぐ popup で見られるように早めに書く. */
const FIRST_FLUSH_DELAY = 3 * 1000

/**
 * 配信中の推移 (1 分ごとの同時接続数・コメント数) を記録する.
 *
 * - メモリに貯めて FLUSH_INTERVAL ごと (と、動画を離れる時) に TimelineStorage に足す.
 * - コメント数は保存しなかったチャットも数える. 同じチャットは 1 回だけ (チャット ID で判定).
 * - 開いた時点で既に表示されていたチャット (開く前のもの) は数えない.
 *   (ページを開き直すたびに同じチャットを数えてしまうため. 投稿時刻が記録を始めた分より前なら除外)
 */
export default class TimelineRecorder {
  protected videoId?: string
  protected startedAt = 0
  protected buffer = new TimelineBuffer()
  protected countedIds = new Set<string>()
  protected timer?: ReturnType<typeof setInterval>
  protected firstTimer?: ReturnType<typeof setTimeout>

  /** 配信中の動画の記録を始める. */
  public start(videoId: string, now = new Date()): void {
    void this.stop()
    this.videoId = videoId
    this.startedAt = now.getTime()
    this.timer = setInterval(() => void this.flush(), FLUSH_INTERVAL)
    this.firstTimer = setTimeout(() => void this.flush(), FIRST_FLUSH_DELAY)
    Logger.debug(`📈[timeline] start (${videoId})`)
  }

  /**
   * 記録をやめる (貯めた分は書き込む).
   *
   * - 状態は同期的に戻す (書き込みを待っている間に start されても、新しい記録を消さないように).
   */
  public stop(): Promise<void> {
    clearInterval(this.timer)
    clearTimeout(this.firstTimer)
    this.timer = undefined
    this.firstTimer = undefined
    const pending = this.flush()
    this.videoId = undefined
    this.countedIds.clear()
    return pending
  }

  /** チャットを 1 件数える. (記録中でなければ何もしない) */
  public addChat(chat: Chat): void {
    if (!this.videoId || !chat.timestamp) return
    if (chat.timestamp.getTime() < this.startedAt - MINUTE) return // 開く前のチャット
    if (chat.id) {
      if (this.countedIds.has(chat.id)) return
      this.countedIds.add(chat.id)
    }
    this.buffer.addComment(chat.timestamp)
  }

  /** 同時接続数を記録する. */
  public addViewers(viewers: number, at = new Date()): void {
    if (!this.videoId) return
    this.buffer.addViewers(viewers, at)
  }

  /** 貯めた記録を storage に足す. */
  public flush(): Promise<void> {
    // 動画 ID と貯めた記録は同期的に取り出す (書き込み中に動画が変わっても混ざらない)
    const videoId = this.videoId
    if (!videoId || this.buffer.size === 0) return Promise.resolve()
    const points = this.buffer.take()
    return TimelineStorage.add(videoId, points).catch(err => Logger.error(err))
  }
}
