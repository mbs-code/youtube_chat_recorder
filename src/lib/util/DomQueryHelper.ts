export default class DomQueryHelper {
  /**
   * DOM の属性を取得する.
   *
   * @param node root DOM
   * @param selector DOM selector (null なら node 自身)
   * @param attrName attribute name
   */
  public static getAttribute(node: Element, selector: string | null, attrName: string): string | undefined {
    const dom = selector ? node.querySelector(selector) : node
    return dom?.getAttribute(attrName)?.trim() || undefined
  }

  /**
   * DOM の属性が存在するか確認する.
   */
  public static hasAttribute(node: Element, selector: string | null, attrName: string): boolean {
    const dom = selector ? node.querySelector(selector) : node
    return dom ? dom.hasAttribute(attrName) : false
  }

  /**
   * DOM のテキストを取得する.
   */
  public static getTextContent(node: Element, selector?: string): string | undefined {
    const dom = selector ? node.querySelector(selector) : node
    return dom?.textContent?.trim() || undefined
  }
}
