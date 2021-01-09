import { classToPlain, plainToClass, serialize } from 'class-transformer'
import { browser } from 'webextension-polyfill-ts'
import Logger from '../../../loggers/Logger'
import Config from '../../../models/Config'

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
    config.updatedAt = new Date()
    config.createdAt = config.createdAt || config.updatedAt

    // 値の置き換え
    Logger.debug(`> 💾[save] config: ${JSON.stringify(config)}`)
    await this.replace(config)
  }

  public static async clear(): Promise<Config | undefined> {
    const config = await this.get()

    // 値があったら消しとく
    if (config) {
      Logger.debug(`> 💾[remove] config`)
      await browser.storage.local.remove(this.STORAGE_KEY)
    }
    return config
  }

  ///

  public static async exportText(): Promise<string> {
    Logger.debug(`> 💾[export] config`)
    const config = await this.get()

    // json 化して出力する
    const text = serialize(classToPlain(config))
    const blob = new Blob([text], { type: 'octet/stream' })
    const url = window.URL.createObjectURL(blob)
    return url
  }

  public static async importText(text: string): Promise<Config> {
    Logger.debug(`> 💾[import] config`)

    const json = JSON.parse(text)
    const config = plainToClass(Config, json)
    // TODO: { excludeExtraneousValues:true } を付けたいが, boolean が確定 false になってしまう

    // config を上書き
    await this.save(config)
    return config
  }
}
