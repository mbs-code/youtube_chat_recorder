export default class DomQueryHelper {
  /**
   * DOM の属性を取得する.
   *
   * @param {Element} node root DOM
   * @param {string | null} [selector=null] DOM selector
   * @param {string} attrName attribure name
   * @return {string | undefined} get value
   */
  public static getAttribute(node: Element, selector: string | null, attrName: string): string | undefined {
    const dom = selector ? node.querySelector(selector) : node
    if (dom) {
      const text = dom.getAttribute(attrName)?.trim()
      return text || undefined
    }
    return undefined
  }

  /**
   * DOM の属性が存在するか確認する.
   *
   * @param {Element} node root DOM
   * @param {string | null} [selector=null] DOM selector
   * @param {string} attrName attribure name
   * @return {boolean} has
   */
  public static hasAttribute(node: Element, selector: string | null, attrName: string): boolean {
    const dom = selector ? node.querySelector(selector) : node
    if (dom) {
      return dom.hasAttribute(attrName)
    }
    return false
  }

  /**
   * DOM のテキストを取得する..
   *
   * @param {Element} node root DOM
   * @param {string | null} [selector=null] DOM selector
   * @return {string | undefined} get value
   */
  public static getTextContent(node: Element, queryName?: string): string | undefined {
    const dom = queryName ? node.querySelector(queryName) : node
    if (dom) {
      const text = dom.textContent?.trim()
      return text || undefined
    }
    return undefined
  }
}
