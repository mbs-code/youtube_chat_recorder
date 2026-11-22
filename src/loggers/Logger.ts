export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'all'

export const LEVELS: Record<LogLevel, { name: LogLevel, value: number }> = {
  silent: { name: 'silent', value: Number.MAX_SAFE_INTEGER },
  error: { name: 'error', value: 5000 },
  warn: { name: 'warn', value: 4000 },
  info: { name: 'info', value: 3000 },
  debug: { name: 'debug', value: 2000 },
  trace: { name: 'trace', value: 1000 },
  all: { name: 'all', value: -1 },
}

const PREFIX = '[YCR]'

export default class Logger {
  public static SHOW_LOG_LEVEL: LogLevel = 'info'

  public static setLevel(level: LogLevel | undefined): void {
    if (level && level in LEVELS) this.SHOW_LOG_LEVEL = level
  }

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
