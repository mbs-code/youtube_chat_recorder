import * as delay from 'delay'

/**
 * 値が取得できるまで繰り返す処理.
 *
 * @static
 * @param {() => T | Promise<T>} func 繰り返したい処理
 * @param {number} [maxTry=10] 最大実行回数
 * @param {number} [interval=1000] 待機時間
 * @return {T | undefined} func() で取得した値, 失敗時は undefined
 */
export default async function retry<T>(func: () => T | Promise<T>, maxTry: number | 10 = 10, interval: number | 1000 = 1000): Promise<T | undefined> {
  for (let i = 0; i < maxTry; i++) {
    const res = await func()
    if (res) return res

    await delay(interval)
  }
  return undefined
}
