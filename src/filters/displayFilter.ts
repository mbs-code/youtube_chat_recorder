import { format as dateFormat, formatDistanceToNow } from 'date-fns'
import byteSize from 'byte-size'
import jaLocale from 'date-fns/locale/ja'

import * as TimeFormat from 'hh-mm-ss'

export default {
  datetimeString(date?: Date): string {
    if (date) return dateFormat(date, 'yyyy-MM-dd HH:mm:ss')
    return '-'
  },

  distanceHumanized(date?: Date): string {
    if (date) return formatDistanceToNow(date, { addSuffix: true, locale: jaLocale })
    return '-'
  },

  hmsString(seconds?: number): string {
    if (seconds) {
      return TimeFormat.fromS(seconds)
    }
    return '-'
  },

  formatByte(val?: number) {
    if (val) {
      const bs = byteSize(val)
      return bs.value + ' ' + bs.unit
    }
    return '-'
  }
}
