export default interface VideoObjectInterface {
  videoId?: string // extend

  '@context': string
  '@type': string
  description: string
  duration: string // PT0S
  enbedUrl: string
  interactionCount: number
  name: string
  thumbnailUrl: string[]
  uploadDate: string // 2020-12-26
  genre: string
  author: string

  publication?: {
    '@type': string
    isLiveBroadcast: boolean
    startDate?: string // 2020-12-27T03:00:28+00:00
    endDate?: string // 2020-12-27T03:00:28+00:00
  }
}
