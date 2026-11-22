import type Chat from '../../models/Chat'

/** チャットがフィルターに当てはまるか判定する関数. */
export type ChatFilterFunc = (chat: Chat) => boolean

/** チャットの処理方法. save: 文字だけ保存, image: 画像化して保存, false: 何もしない. */
export type ChatTaskType = 'save' | 'image' | false

/** 判定に使うフィルター (設定値 + 判定関数). */
export interface ChatFilterDataInterface {
  key: string // 基本フィルターは 'owner' など、テキストマッチングは作成日時の数字
  title: string // 画面に出す名前

  doSave?: boolean // 保存する
  doImage?: boolean // 画像化する

  func?: ChatFilterFunc // 判定関数 (作れなかった場合は undefined)
}

/** 設定 (@config.chatFilters) に保存するフィルター. */
export interface ChatFilterConfigInterface {
  key: string
  title: string

  doSave: boolean
  doImage: boolean

  // ↓ テキストマッチングのフィルターのみ
  textMode?: 'message' | 'author' | undefined // 本文 / 投稿者名 のどちらと比べるか
  match?: string // 比べる文字列
  isRegex?: boolean // 正規表現として比べる
  isExact?: boolean // 完全一致で比べる (false なら部分一致)
}
