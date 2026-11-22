import { format as dateFormat } from 'date-fns'
import { sanitize as sanitizeFilename } from 'sanitize-filename-ts'
import type Chat from '../../models/Chat'
import type Video from '../../models/Video'

const DEFAULT_DATE_FORMAT = 'yyyy-MM-dd_HH_mm_ss'

export default class FilenameFormatter {
  /**
   * ファイル名をフォーマットする.
   *
   * - `%title%`, `%id%`, `%count%`, `%now(format)%`, `%upload(format)%` を置換する.
   * - 禁則文字はエスケープする.
   *
   * @param filenameFormat フォーマット前のファイル名
   * @param video 動画
   * @param chats チャット配列
   */
  public static format(filenameFormat: string, video: Video, chats: Chat[]): string {
    const replaced = filenameFormat.replace(/%(\w+)(?:\((.+?)\))?%/g, (_, order: string, subOrder?: string) => {
      switch (order) {
        case 'title':
          return video.title || '<error>'
        case 'id':
          return video.id || '<error>'
        case 'count':
          return String(chats.length)
        case 'now':
          return dateFormat(new Date(), subOrder || DEFAULT_DATE_FORMAT)
        case 'upload':
          return video.publishedAt ? dateFormat(video.publishedAt, subOrder || DEFAULT_DATE_FORMAT) : '<error>'
        default:
          return '<error>'
      }
    })

    return sanitizeFilename(replaced)
  }
}
