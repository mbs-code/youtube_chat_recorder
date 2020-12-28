export default class Utll {
  public static hmsToSeconds(value: string): number {
    // [-]hh:mm:ss
    const base = value.indexOf('-') >= 0 ? -1 : 1
    const p = value.replace('-', '').split(':')
    let s = 0
    let m = 1

    while (p.length > 0) {
      const str: string = p.pop() || '0'
      s += m * parseInt(str, 10)
      m *= 60
    }

    return base * s
  }
}
