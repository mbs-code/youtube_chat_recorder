import Logger from '../../../loggers/Logger'
import Config from '../../../models/Config'
import BaseStorage from './BaseStorage'

export default class ConfigStorage extends BaseStorage {
  public static readonly STORAGE_KEY = '@config'

  /**
   * 設定を取り出す.
   *
   * @static
   * @return {Config} config object
   */
  public static async get(): Promise<Config> {
    const config = await this.getClassObject(Config, this.STORAGE_KEY)
    return config || new Config()
  }

  /**
   * 設定を上書き保存する.
   *
   * @static
   * @param {Config} config config object
   */
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
    Logger.debug(`> 💾[save] ${this.STORAGE_KEY}: ${JSON.stringify(config)}`)
    await this.replaceObject(this.STORAGE_KEY, config)
  }

  /**
   * 設定情報を空にする.
   *
   * @static
   * @return {boolean} 削除できたか(false で失敗、存在しない)
   */
  public static async clear(): Promise<boolean> {
    return await this.removeKey(this.STORAGE_KEY)
  }

  /// ////////////////////////////////////////

  public static async export(): Promise<string> {
    Logger.debug(`> 💾[export] config`)
    const text = await super.parseText(this.STORAGE_KEY)
    return text
  }

  public static async import(text: string): Promise<Config> {
    Logger.debug(`> 💾[import] config`)

    const config = await super.importText<Config>(Config, text)

    // config を上書き
    await this.save(config)
    return config
  }
}
