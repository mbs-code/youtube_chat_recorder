import { Transform } from 'class-transformer'

// Date <-> number の transform decorator
export default function () {
  const toClassFn = Transform(value => new Date(value), { toClassOnly: true })
  const toPlainFn = Transform(value => value instanceof Date ? value.getTime() : undefined, { toPlainOnly: true })

  return function (target: any, key: string) {
    toClassFn(target, key)
    toPlainFn(target, key)
  }
}
