// storage.ts
import type { SavedTab } from "./types"

// 用于存储数据的 key
const STORAGE_KEY = "savedTabs"

/**
 * 从 chrome.storage.local 获取所有已保存的标签页
 * @returns Promise<SavedTab[]> 返回按保存时间倒序排序的标签页数组
 */
export const getSavedTabs = async (): Promise<SavedTab[]> => {
  // 从本地存储中获取数据
  const result = await chrome.storage.local.get(STORAGE_KEY)
  // 如果没有数据，返回空数组；否则返回存储的数据
  const tabs: SavedTab[] = result[STORAGE_KEY] || []
  // 按 savedAt 降序排序 (最新的在前面)
  tabs.sort((a, b) => b.savedAt - a.savedAt)
  return tabs
}

/**
 * 保存新的标签页到 chrome.storage.local
 * @param tabsToSave 要保存的标签页信息数组 (不包含 id 和 savedAt)
 * @returns Promise<void>
 */
export const saveTabs = async (
  tabsToSave: Omit<SavedTab, "id" | "savedAt">[]
): Promise<void> => {
  // 获取已存在的标签页
  const existingTabs = await getSavedTabs()
  const now = Date.now() // 获取当前时间戳

  // 为新标签页生成唯一 ID 和保存时间
  const newTabs: SavedTab[] = tabsToSave.map((tab, index) => ({
    ...tab,
    // 生成唯一 ID：时间戳 + 索引 + 随机字符串
    id: `${now}-${index}-${Math.random().toString(36).substring(2, 9)}`,
    savedAt: now
  }))

  // --- 可选：防止重复保存相同 URL ---
  // 过滤掉那些 URL 已经存在于 existingTabs 中的新标签页
  const uniqueNewTabs = newTabs.filter(
    (newTab) =>
      !existingTabs.some((existingTab) => existingTab.url === newTab.url)
  )
  // ---------------------------------

  // 合并新标签页和旧标签页 (新标签页在前)
  const updatedTabs = [...uniqueNewTabs, ...existingTabs]
  // 将更新后的数组存回本地存储
  await chrome.storage.local.set({ [STORAGE_KEY]: updatedTabs })
  console.log(`Saved ${uniqueNewTabs.length} new tabs.`) // 打印保存日志
}

/**
 * 根据 ID 删除一个已保存的标签页
 * @param tabId 要删除的标签页的 ID
 * @returns Promise<void>
 */
export const deleteTab = async (tabId: string): Promise<void> => {
  // 获取所有已存在的标签页
  const existingTabs = await getSavedTabs()
  // 过滤掉要删除的标签页
  const updatedTabs = existingTabs.filter((tab) => tab.id !== tabId)
  // 将更新后的数组存回本地存储
  await chrome.storage.local.set({ [STORAGE_KEY]: updatedTabs })
  console.log(`Deleted tab with ID: ${tabId}`) // 打印删除日志
}

/**
 * 清空所有已保存的标签页 (危险操作，谨慎使用)
 * @returns Promise<void>
 */
export const clearAllTabs = async (): Promise<void> => {
  // 从本地存储中移除对应的 key
  await chrome.storage.local.remove(STORAGE_KEY)
  console.log("Cleared all saved tabs.") // 打印清空日志
}
