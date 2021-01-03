import * as chalk from 'chalk'
import { format as dateFormat } from 'date-fns'

export type LogLevel = 'trace' | 'debug' |'info' | 'warn' | 'error'

export default class Logger {
  public static log(logLevel: LogLevel, message: any, style?: string) {
    const datetime = dateFormat(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS')
    const level = logLevel.toUpperCase().padEnd(5, ' ')
    const text = message

    // const log = `${datetime} [${level.toUpperCase()}] ${text}`
    let log = `[${level}] ${text}`

    if (style) {
      console.log('%c' + log, style)
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
