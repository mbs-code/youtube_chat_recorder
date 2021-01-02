import Chat from '../../models/Chat'

export type ChatFilterFunc = (chat: Chat) => boolean

export type ChatTaskType = 'save' | 'image' | false

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
