/**
 * 配信の推移 (1 分ごとの同時接続数とコメント数).
 *
 * - storage には `@timeline:<動画ID>` に TimelinePoint[] (時刻の昇順) で保存する.
 * - 同じ分のデータは足し合わせる: コメント数は合計、同時接続数は大きい方.
 *   (同じ動画を複数のタブで開いていても、書き込みの順番に関係なく同じ結果になる)
 */

/** 1 分 (msec). */
export const MINUTE = 60 * 1000

/** 1 分ごとの記録. */
export interface TimelinePoint {
  t: number // 分の先頭の時刻 (epoch msec)
  viewers?: number // その分の最大同時接続数 (読めなかった分は無い)
  comments: number // その分に流れたコメント数 (保存しなかったものも含む)
}

/** 日時をその分の先頭 (epoch msec) にする. */
export function toMinute(date: Date | number): number {
  const time = typeof date === 'number' ? date : date.getTime()
  return Math.floor(time / MINUTE) * MINUTE
}

/** 同じ分の 2 つの記録をまとめる. */
function mergePoint(a: TimelinePoint, b: TimelinePoint): TimelinePoint {
  const viewers = a.viewers === undefined ? b.viewers : b.viewers === undefined ? a.viewers : Math.max(a.viewers, b.viewers)
  return { t: a.t, viewers, comments: a.comments + b.comments }
}

/**
 * 記録を足し合わせる. (時刻の昇順で返す)
 *
 * @param base 保存済みの記録
 * @param add 追加する記録
 */
export function mergeTimeline(base: TimelinePoint[], add: TimelinePoint[]): TimelinePoint[] {
  const byMinute = new Map<number, TimelinePoint>()
  for (const point of [...base, ...add]) {
    const prev = byMinute.get(point.t)
    byMinute.set(point.t, prev ? mergePoint(prev, point) : { ...point })
  }
  return [...byMinute.values()].sort((a, b) => a.t - b.t)
}

/**
 * 1 分ごとの記録をメモリに貯めるバッファ. (content script で使い、まとめて storage に書く)
 */
export class TimelineBuffer {
  protected points = new Map<number, TimelinePoint>()

  /** コメントを 1 件数える. */
  public addComment(at: Date | number): void {
    this.point(at).comments++
  }

  /** 同時接続数を記録する (その分の最大を残す). */
  public addViewers(viewers: number, at: Date | number): void {
    const point = this.point(at)
    point.viewers = Math.max(point.viewers ?? 0, viewers)
  }

  /** 貯めた記録を取り出して空にする. */
  public take(): TimelinePoint[] {
    const points = [...this.points.values()].sort((a, b) => a.t - b.t)
    this.points.clear()
    return points
  }

  public get size(): number {
    return this.points.size
  }

  protected point(at: Date | number): TimelinePoint {
    const t = toMinute(at)
    let point = this.points.get(t)
    if (!point) {
      point = { t, comments: 0 }
      this.points.set(t, point)
    }
    return point
  }
}

/**
 * 再生数・高評価数・コメント数の記録. (`@views:<動画ID>` に時刻の昇順で保存する)
 *
 * - 動画が再生されるたびに記録する (ほかの推移とは別). 同じ分は項目ごとに大きい方を残す.
 * - likes / commentCount は後から足した項目なので、無い (読めなかった) こともある.
 */
export interface ViewCountPoint {
  t: number // 分の先頭の時刻 (epoch msec)
  views: number
  likes?: number // 高評価数
  commentCount?: number // 動画のコメント欄のコメント数 (配信のチャット欄とは別)
}

function maxOptional(a?: number, b?: number): number | undefined {
  return a === undefined ? b : b === undefined ? a : Math.max(a, b)
}

/** 再生数の記録を足し合わせる. (時刻の昇順で返す) */
export function mergeViewCounts(base: ViewCountPoint[], add: ViewCountPoint[]): ViewCountPoint[] {
  const byMinute = new Map<number, ViewCountPoint>()
  for (const point of [...base, ...add]) {
    const prev = byMinute.get(point.t)
    const merged: ViewCountPoint = { t: point.t, views: Math.max(prev?.views ?? 0, point.views) }
    const likes = maxOptional(prev?.likes, point.likes)
    const commentCount = maxOptional(prev?.commentCount, point.commentCount)
    if (likes !== undefined) merged.likes = likes
    if (commentCount !== undefined) merged.commentCount = commentCount
    byMinute.set(point.t, merged)
  }
  return [...byMinute.values()].sort((a, b) => a.t - b.t)
}
