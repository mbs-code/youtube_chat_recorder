import Logger from '../../loggers/Logger'

export const sleep = (msec: number): Promise<void> => new Promise(resolve => setTimeout(resolve, msec))

/**
 * 値が取得できるまで繰り返す.
 *
 * - 配列なら要素が 1 つ以上、それ以外は truthy になったら成功とみなす.
 *
 * @param func 繰り返したい処理
 * @param maxTry 最大実行回数
 * @param interval 待機時間 (msec)
 * @return func() で取得した値, 失敗時は undefined
 */
export default async function retry<T>(func: () => T | Promise<T>, maxTry = 10, interval = 1000): Promise<NonNullable<T> | undefined> {
  for (let i = 0; i < maxTry; i++) {
    const res = await func()

    if (Array.isArray(res) ? res.length > 0 : res) {
      return res as NonNullable<T>
    }

    if (i < maxTry - 1) {
      await sleep(interval)
      Logger.trace(`Retry ${i + 1} times (wait: ${interval} msec)`)
    }
  }
  return undefined
}
