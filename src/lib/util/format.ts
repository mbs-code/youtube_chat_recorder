import { format as dateFormat, formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

/** 表示用の日時文字列. */
export function datetimeString(date?: Date | null): string {
  return date ? dateFormat(date, 'yyyy-MM-dd HH:mm:ss') : '-'
}

/** "3 分前" のような相対時間. */
export function distanceHumanized(date?: Date | null): string {
  return date ? formatDistanceToNow(date, { addSuffix: true, locale: ja }) : '-'
}

/** 秒数を [-][h:]mm:ss にする. */
export function hmsString(seconds?: number | null): string {
  if (seconds === undefined || seconds === null || Number.isNaN(seconds)) return '-'

  const sign = seconds < 0 ? '-' : ''
  const abs = Math.floor(Math.abs(seconds))
  const h = Math.floor(abs / 3600)
  const m = Math.floor((abs % 3600) / 60)
  const s = abs % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${sign}${h}:${pad(m)}:${pad(s)}` : `${sign}${pad(m)}:${pad(s)}`
}

/**
 * グラフの時刻の目盛り. 配信開始が分かれば経過時間 (h:mm) を添える: "21:10 (1:05)".
 *
 * @param pattern 時刻の書式 (date-fns)
 */
export function timeLabel(time: number, start?: Date, pattern = 'H:mm'): string {
  const label = dateFormat(time, pattern)
  const elapsed = start ? Math.floor((time - start.getTime()) / 60000) : undefined
  if (elapsed === undefined || elapsed < 0) return label
  return `${label} (${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')})`
}

/** [-]h:m:s 形式の文字列を秒数にする. */
export function hmsToSeconds(value: string): number {
  const sign = value.trim().startsWith('-') ? -1 : 1
  const parts = value.replace('-', '').trim().split(':')
  return sign * parts.reduce((acc, part) => acc * 60 + (parseInt(part, 10) || 0), 0)
}

/** バイト数を "12.3 MB" のような表記にする (SI 単位). */
export function formatByte(bytes = 0): string {
  const units = ['B', 'kB', 'MB', 'GB', 'TB']
  let value = bytes
  let i = 0
  while (value >= 1000 && i < units.length - 1) {
    value /= 1000
    i++
  }
  return `${i === 0 ? value : value.toFixed(1)} ${units[i]}`
}

/** 文字列を最大長で切り詰める. */
export function ellipsis(text: string, max: number): string {
  const chars = Array.from(text)
  return chars.length > max ? chars.slice(0, max).join('') + '...' : text
}
