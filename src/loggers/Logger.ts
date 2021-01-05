import { format as dateFormat } from 'date-fns'

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace'

export const LEVELS = {
  error: {
    name: 'error',
    value: 5000,
  },
  warn: {
    name: 'warn',
    value: 4000,
  },
  info: {
    name: 'info',
    value: 3000,
  },
  debug: {
    name: 'debug',
    value: 2000,
  },
  trace: {
    name: 'trace',
    value: 1000,
  }
}

export default class Logger {
  public static SHOW_LOG_LEVEL: LogLevel = 'info'

  public static log(logLevel: LogLevel, message: any, style?: string) {
    // レベルの数値比較
    const showLevel = LEVELS[Logger.SHOW_LOG_LEVEL].value
    const ownLevel = LEVELS[logLevel].value
    if (showLevel > ownLevel) {
      return
    }

    const datetime = dateFormat(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS')
    const level = logLevel.toUpperCase().padEnd(5, ' ')
    const text = message

    // const log = `${datetime} [${level.toUpperCase()}] ${text}`
    let log = `[${level}] ${text}`

    if (style) {
      console.log('%c' + log + '%c', style, '')
    } else {
      console.log(log)
    }
  }

  public static error(error: Error) {
    this.log('error', error, 'color: red')
    if (error.stack) {
      this.trace(error.stack)
    }
  }

  public static warn(message: any) {
    this.log('warn', message, 'color: orange')
  }

  public static info(message: any) {
    this.log('info', message, 'color: blue')
  }

  public static debug(message: any) {
    this.log('debug', message, 'color: green')
  }

  public static trace(message: any) {
    this.log('trace', message, 'color: gray')
  }
}
