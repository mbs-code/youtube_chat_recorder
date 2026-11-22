import Logger from '../../../loggers/Logger'
import Config from '../../../models/Config'
import BaseStorage from './BaseStorage'

export default class ConfigStorage extends BaseStorage {
  public static readonly STORAGE_KEY = '@config'

  /**
   * 設定を取り出す (無ければ初期値).
   */
  public static async get(): Promise<Config> {
    const config = await this.getObject(Config.fromPlain, this.STORAGE_KEY)
    return config || new Config()
  }

  /**
   * 設定を上書き保存する.
   */
  public static async save(config: Config): Promise<void> {
    const db = await this.getObject(Config.fromPlain, this.STORAGE_KEY)

    // 作成日時は引き継ぐ
    config.updatedAt = new Date()
    config.createdAt = db?.createdAt || config.updatedAt

    Logger.debug(`> 💾[save] ${this.STORAGE_KEY}: ${JSON.stringify(config.toPlain())}`)
    await this.replaceObject(this.STORAGE_KEY, config)
  }

  /**
   * 設定情報を空にする.
   *
   * @return 削除できたか (false なら存在しない)
   */
  public static async clear(): Promise<boolean> {
    return await this.removeKey(this.STORAGE_KEY)
  }

  /// ////////////////////////////////////////

  /** 設定を JSON にしてダウンロード用の object url を返す. */
  public static async export(prettier = false): Promise<string> {
    Logger.debug(`> 💾[export] config`)
    return await this.exportObjectURL(this.STORAGE_KEY, prettier)
  }

  public static async import(text: string): Promise<void> {
    Logger.debug(`> 💾[import] config`)
    await this.replaceText(this.STORAGE_KEY, text)
  }
}
