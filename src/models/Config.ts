
export default class Config {
  // 結合ファイル名
  mergeImageFileName?: string

  // 最大保存video数
  maxVideoLength?: number

  constructor() {
    this.mergeImageFileName = 'image.png'
    this.maxVideoLength = 10
  }
}
