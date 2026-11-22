/**
 * 一定数ずつ順番に処理するキュー.
 *
 * - 処理中に push されたものは、処理完了後に PROCESS_INTERVAL 毎にまとめて処理する.
 */
export default abstract class BaseQueue<T> {
  public static COUNT_TO_PROCESS_AT_ONE = 10
  public static PROCESS_INTERVAL = 1000

  protected queue: T[] = []
  protected timer?: ReturnType<typeof setInterval>
  protected isRun = false

  protected abstract invoke(items: T[]): Promise<void>

  public reset(): void {
    this.queue = []
    this.isRun = false
    this.timerStop()
  }

  public push(...values: T[]): void {
    this.queue.push(...values)
    this.exec()
  }

  public exec(): void {
    // 処理中なら完了を待つ
    if (this.isRun) {
      this.timerStart()
      return
    }

    const values = this.queue.splice(0, BaseQueue.COUNT_TO_PROCESS_AT_ONE)
    if (values.length === 0) {
      this.timerStop()
      return
    }

    this.isRun = true
    this.invoke(values).finally(() => {
      this.isRun = false
      if (this.queue.length > 0) this.timerStart()
    })
  }

  ///

  protected timerStart(): void {
    if (this.timer === undefined) {
      this.timer = setInterval(() => this.exec(), BaseQueue.PROCESS_INTERVAL)
    }
  }

  protected timerStop(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer)
      this.timer = undefined
    }
  }
}
