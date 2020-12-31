import { classToPlain, plainToClass } from 'class-transformer'
import { browser } from 'webextension-polyfill-ts'
import Config from '../../models/Config'

export default class ConfigStorage {
  public static readonly STORAGE_KEY = '@config'

  public static async get(): Promise<Config> {
    const value = await browser.storage.local.get(this.STORAGE_KEY)
    const plain: any | undefined = value[this.STORAGE_KEY]

    // デシリアライズする
    if (plain) {
      const config = plainToClass(Config, plain)
      return config
    }
    return new Config()
  }

  protected static async replace(config: Config): Promise<void> {
    // シリアライズする
    const plain = classToPlain(config)
    await browser.storage.local.set({ [this.STORAGE_KEY]: plain })
  }

  public static async save(config: Config): Promise<void> {
    const db = await this.get()

    // db があるなら情報を引き継ぐ
    if (db) {
      config.createdAt = db.createdAt
    }

    // 更新日時の付与
    config.createdAt = config.createdAt || new Date()
    config.updatedAt = new Date()

    // 値の置き換え
    console.log(`💾[save] config: ${JSON.stringify(config)}`)
    await this.replace(config)
  }

  public static async clear(): Promise<Config | undefined> {
    const config = await this.get()

    // 値があったら消しとく
    if (config) {
      console.log(`💾[remove] config`)
      await browser.storage.local.remove(this.STORAGE_KEY)
    }
    return config
  }
}
