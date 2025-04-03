// types.ts
/**
 * 定义保存的标签页的数据结构
 */
export interface SavedTab {
  /**
   * 唯一标识符 (例如：时间戳 + 随机字符串)
   */
  id: string
  /**
   * 标签页的 URL
   */
  url: string
  /**
   * 标签页的标题
   */
  title: string
  /**
   * 网站图标的 URL (可选)
   */
  favIconUrl?: string
  /**
   * 标签页被保存时的时间戳 (毫秒)
   */
  savedAt: number
}
