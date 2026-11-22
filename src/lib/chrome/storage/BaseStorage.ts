import Logger from '../../../loggers/Logger'
import type { Plain } from '../../util/serialize'

/** plain object から復元する関数. */
export type FromPlain<T> = (plain: Plain) => T

/** plain object に変換できるクラス. */
export interface ToPlain {
  toPlain(): Plain
}

export default class BaseStorage {
  protected static async getPlain(key: string): Promise<unknown> {
    const value = await chrome.storage.local.get(key)
    return value[key]
  }

  protected static async getObject<T>(fromPlain: FromPlain<T>, key: string): Promise<T | undefined> {
    const plain = await this.getPlain(key)
    if (!plain || typeof plain !== 'object') return undefined
    return fromPlain(plain as Plain)
  }

  protected static async getObjectArray<T>(fromPlain: FromPlain<T>, key: string): Promise<T[]> {
    const plains = await this.getPlain(key)
    if (!Array.isArray(plains)) return []
    return plains.map(plain => fromPlain(plain as Plain))
  }

  /// //////////

  protected static async replaceObject(key: string, obj: ToPlain | ToPlain[]): Promise<void> {
    const plain = Array.isArray(obj) ? obj.map(e => e.toPlain()) : obj.toPlain()
    await this.replacePlain(key, plain)
  }

  protected static async replacePlain(key: string, plain: unknown): Promise<void> {
    await chrome.storage.local.set({ [key]: plain })
  }

  /// //////////

  protected static async removeKey(key: string): Promise<boolean> {
    const plain = await this.getPlain(key)
    if (plain === undefined) return false

    Logger.debug(`> 💾[remove key] ${key}`)
    await chrome.storage.local.remove(key)
    return true
  }

  /// //////////

  /** key の値を JSON にしてダウンロード用の object url を作る. */
  protected static async exportObjectURL(key: string, prettier = false): Promise<string> {
    const plain = await this.getPlain(key)
    return createJsonObjectURL(plain ?? {}, prettier)
  }

  protected static async replaceText(key: string, text: string): Promise<void> {
    await this.replacePlain(key, JSON.parse(text))
  }
}

export function createJsonObjectURL(value: unknown, prettier = false): string {
  const text = JSON.stringify(value, null, prettier ? 2 : undefined)
  const blob = new Blob([text], { type: 'application/json' })
  return URL.createObjectURL(blob)
}
