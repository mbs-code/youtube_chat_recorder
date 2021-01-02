import Chat from '../../models/Chat'

type ChatFilterFunc = (chat: Chat) => boolean

export interface ChatFilterDataInterface {
  key: string
  title: string

  doSave?: boolean
  doImage?: boolean
  func?: ChatFilterFunc
}

export interface ChatFilterConfigInterface {
  key: string
  title: string

  doSave: boolean
  doImage: boolean

  textMode?: 'message' | 'author' | undefined
  match?: string
  isRegex?: boolean
  isExact?: boolean
}
