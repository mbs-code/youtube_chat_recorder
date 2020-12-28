export default interface VideoObjectInterface {
  videoId?: string // extend

  '@context': string
  '@type': string
  description: string
  duration: string // PT0S, 配信中は 0
  enbedUrl: string // "https://www.youtube.com/embed/<videoId>?start=<sec>"
  interactionCount: number
  name: string
  thumbnailUrl: string[]
  uploadDate: string // 2020-12-26
  genre: string // Entertainment, Games
  author: string

  publication?: {
    '@type': string // ex) BroadcastEvent
    isLiveBroadcast: boolean
    startDate?: string // 2020-12-27T03:00:28+00:00
    endDate?: string // 2020-12-27T03:00:28+00:00
  }[]
}
