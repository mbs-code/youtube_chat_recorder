import { classToPlain, plainToClass, serialize } from 'class-transformer'
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

  protected static async parseText(key: string): Promise<string> {
    const config = await this.getPlain(key)

    // json 化して出力する
    const text = serialize(classToPlain(config))
    const blob = new Blob([text], { type: 'octet/stream' })
    const url = window.URL.createObjectURL(blob)
    return url
  }

  protected static async importText<T>(ctor: { new(): T }, text: string): Promise<T> {
    const json = JSON.parse(text)
    const obj = plainToClass(ctor, json)
    // TODO: { excludeExtraneousValues:true } を付けたいが, boolean が確定 false になってしまう
    return obj
  }
}
