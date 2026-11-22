/** ログレベル. silent は何も出さない、all は全て出す. */
export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'all'

/** ログレベルと優先度 (数字が大きいほど重要). 設定画面の選択肢にも使う. */
export const LEVELS: Record<LogLevel, { name: LogLevel, value: number }> = {
  silent: { name: 'silent', value: Number.MAX_SAFE_INTEGER },
  error: { name: 'error', value: 5000 },
  warn: { name: 'warn', value: 4000 },
  info: { name: 'info', value: 3000 },
  debug: { name: 'debug', value: 2000 },
  trace: { name: 'trace', value: 1000 },
  all: { name: 'all', value: -1 },
}

/** ログの先頭に付ける目印 (DevTools のコンソールで絞り込みやすいように). */
const PREFIX = '[YCR]'

/**
 * console に出すログ.
 *
 * - SHOW_LOG_LEVEL 以上の重要度のログだけ出す (設定画面の「出力するログレベル」).
 * - content script / background / 画面 それぞれで別のインスタンス (static) になるので、各所で設定を反映すること.
 */
export default class Logger {
  /** 出力するログレベル. */
  public static SHOW_LOG_LEVEL: LogLevel = 'info'

  /** 出力するログレベルを変える (不正な値なら変えない). */
  public static setLevel(level: LogLevel | undefined): void {
    if (level && level in LEVELS) this.SHOW_LOG_LEVEL = level
  }

  /** ログを出す. style は %c で付ける CSS. */
  public static log(logLevel: LogLevel, message: unknown, style?: string): void {
    const showLevel = LEVELS[this.SHOW_LOG_LEVEL]?.value ?? LEVELS.info.value
    if (showLevel > LEVELS[logLevel].value) return

    const text = `${PREFIX}[${logLevel.toUpperCase().padEnd(5, ' ')}] ${String(message)}`
    if (style) {
      console.log('%c' + text, style)
    } else {
      console.log(text)
    }
  }

  /** エラー. Error ならスタックトレースも trace で出す. */
  public static error(error: unknown): void {
    this.log('error', error, 'color: red')
    if (error instanceof Error && error.stack) {
      this.trace(error.stack)
    }
  }

  public static warn(message: unknown): void {
    this.log('warn', message, 'color: orange')
  }

  public static info(message: unknown): void {
    this.log('info', message, 'color: dodgerblue')
  }

  public static debug(message: unknown): void {
    this.log('debug', message, 'color: green')
  }

  public static trace(message: unknown): void {
    this.log('trace', message, 'color: gray')
  }
}
