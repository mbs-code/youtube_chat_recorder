/** chrome.storage に保存できるプレーンなオブジェクト. */
export type Plain = Record<string, unknown>

/** Date -> epoch msec (保存用). */
export function toTime(date?: Date): number | undefined {
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : undefined
}

/** epoch msec | ISO string -> Date (復元用). */
export function toDate(value: unknown): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const date = value instanceof Date ? value : new Date(value as string | number)
  return Number.isNaN(date.getTime()) ? undefined : date
}
