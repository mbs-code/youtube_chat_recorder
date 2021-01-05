import { format as dateFormat } from 'date-fns'
import { sanitize as sanitizeFilename } from 'sanitize-filename-ts'
import Chat from '../../models/Chat'
import Video from '../../models/Video'

export default class FilenameFormatter {
  /**
   * ファイル名をフォーマットする.
   *
   * @static
   * @param {string} filenameFormat フォーマット前のファイル名
   * @param {Video} video 動画
   * @param {Chat[]} chats チャット配列
   * @return {string} フォーマットしたファイル名
   */
  public static format(filenameFormat: string, video: Video, chats: Chat[]): string {
    let format = filenameFormat

    // %xxx% をすべて取り出す
    const regexp = RegExp(/%.+?%/)

    let match
    while ((match = regexp.exec(format)) !== null) {
      const found = match[0]

      // 置換命令実行
      let order = found.replace(/%/g, '')
      let subOrder = ''
      const subMatch = order.match(/\(.+?\)/) // 括弧を取り出す
      if (subMatch) {
        const match = subMatch[0]
        const st = subMatch.index || 0
        // const len = match.length
        order = order.substring(0, st)
        subOrder = match.replace('(', '').replace(')', '')
      }

      let replace = undefined
      switch (order) {
        case 'title':　replace = video?.title; break
        case 'id': replace = video?.id; break
        // case 'owner': replace = video?. // TODO: 取れないじゃん！
        case 'count': replace = '' + chats.length; break
        case 'now': replace = this.formatDatetime(subOrder, new Date()); break
        case 'upload':
          if (video?.publishedAt) {
            replace = this.formatDatetime(subOrder, video?.publishedAt)
          }
          break
      }

      // 置換する (replace で先頭から置き換えられる)
      format = format.replace(found, replace || '<error>')
    }

    // 禁則文字をエスケープ
    const sanitize = sanitizeFilename(format)

    return sanitize
  }

  protected static formatDatetime(formatString: string, date: Date) {
    const format = formatString || 'yyyy-MM-dd_HH_mm_ss'
    return dateFormat(date, format)
  }
}
