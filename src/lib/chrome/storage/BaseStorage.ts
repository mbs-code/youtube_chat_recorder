import { classToPlain, plainToClass } from 'class-transformer'
import { browser } from 'webextension-polyfill-ts'
import Logger from '../../../loggers/Logger'

type ClassType<T> = { new(): T }

export default class BaseStorage {
  protected static async getPlain(key: string): Promise<any | undefined> {
    const value = await browser.storage.local.get(key)
    const plain = value ? value[key] : undefined
    return plain
  }

  protected static async getClassObject<T>(ctor: ClassType<T>, key: string): Promise<T | undefined> {
    const plain = await this.getPlain(key)
    if (!plain) return undefined

    // デシリアライズする
    const obj = plainToClass(ctor, plain)
    return obj
  }

  protected static async getClassObjectArray<T>(ctor: ClassType<T>, key: string): Promise<T[]> {
    const plains = await this.getPlain(key)
    if (!plains) return []

    // デシリアライズする
    const objs = plains.map((e: any) => plainToClass(ctor, e))
    return objs
  }

  /// //////////

  protected static async replaceObject<T>(key: string, obj: T | T[]): Promise<void> {
    // シリアライズする
    const plain = (Array.isArray(obj))
      ? obj.map(e => classToPlain(e))
      : classToPlain(obj)
    await this.replacePlain(key, plain)
    // Logger.debug(`> 💾[replace] ${key}`)
  }

  protected static async replacePlain(key: string, plain: any): Promise<void> {
    await browser.storage.local.set({ [key]: plain })
  }

  /// //////////

  protected static async removeKey(key: string): Promise<boolean> {
    const plain = this.getPlain(key)
    if (plain) {
      Logger.debug(`> 💾[remove key] ${key}`)
      await browser.storage.local.remove(key)
      return true
    }

    return false
  }

  /// //////////

  protected static async parseObjectURL(key: string, prettier: boolean = false): Promise<string> {
    const plain = await this.getPlain(key)

    // 文字列化する
    const text = plain
      ? JSON.stringify(plain, null, (prettier ? 2 : undefined))
      : '{}' // 空文字

    // blob にして url を出力
    const blob = new Blob([text], { type: 'octet/stream' })
    const urlText = window.URL.createObjectURL(blob)
    return urlText
  }

  protected static async replaceText(key: string, text: string): Promise<void> {
    // json 変換して置き換える
    const json = JSON.parse(text)
    await this.replacePlain(key, json)
  }
}
