export default abstract class BaseQueue<T> {
  public static COUNT_TO_PROCESS_AT_ONE = 10
  public static PROCESS_INTERVAL = 1000

  protected queue: T[] // キュー
  protected timer?: number // タイマー
  protected isRun: boolean // 処理中かどうか

  constructor() {
    this.queue = []
    this.isRun = false
    this.timer = undefined
  }

  protected abstract invoke(items: T[]): Promise<void>

  public reset(): void {
    this.queue = []
    this.isRun = false
    this.timerStop()
  }

  public push(...value: T[]): void {
    this.queue.push(...value)
    this.exec()
  }

  public exec(): void {
    // 処理中なら実行待機処理
    if (this.isRun) {
      this.timerStart()
      return
    }
    this.isRun = true

    // データを破壊的に全部取り出す(最大10)
    const values = this.queue.splice(0, BaseQueue.COUNT_TO_PROCESS_AT_ONE)
    if (!values || values.length === 0) {
      this.timerStop()
      this.isRun = false
      return
    }

    // 処理を実行する
    this.invoke(values).finally(() => {
      // queue が空ではないなら再実行
      if (this.queue.length > 0) this.timerStart()
      this.isRun = false
    })
  }

  ///

  protected timerStart(): void {
    // タイマーが無くて、キューがデータにあるなら監視開始
    if (this.timer === undefined) {
      this.timer = window.setInterval(() => {
        this.exec()
      }, BaseQueue.PROCESS_INTERVAL)
    }
  }

  protected timerStop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = undefined
    }
  }
}
