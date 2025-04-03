// background.ts

// --- 类型定义 (如果不能从 types.ts 导入，需要在此处重新定义或简化) ---
interface SavedTab {
  id: string
  url: string
  title: string
  favIconUrl?: string
  savedAt: number
}

// --- 存储 Key ---
const STORAGE_KEY = "savedTabs"
const BACKUP_STORAGE_KEY = "savedTabs_backup" // 用于本地备份的 Key

// --- 存储读取函数 (如果不能从 storage.ts 导入) ---
/**
 * 从 chrome.storage.local 获取所有已保存的标签页 (后台脚本版本)
 * @returns Promise<SavedTab[]> 返回按保存时间倒序排序的标签页数组
 */
const getSavedTabsForBackground = async (): Promise<SavedTab[]> => {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  const tabs: SavedTab[] = result[STORAGE_KEY] || []
  tabs.sort((a, b) => b.savedAt - a.savedAt) // 确保排序
  return tabs
}

// --- 定时备份逻辑 ---
const BACKUP_ALARM_NAME = "dailyBackupTabs" // 定时器名称

/**
 * 执行备份操作
 * 目前简单地将主数据复制到另一个 storage key
 */
const performBackup = async () => {
  console.log(`[${new Date().toISOString()}] Performing scheduled backup...`)
  try {
    const tabs = await getSavedTabsForBackground()
    if (tabs.length > 0) {
      await chrome.storage.local.set({ [BACKUP_STORAGE_KEY]: tabs })
      console.log(
        `[${new Date().toISOString()}] Backup completed. ${tabs.length} tabs saved to key: ${BACKUP_STORAGE_KEY}`
      )
    } else {
      console.log(`[${new Date().toISOString()}] No tabs to backup.`)
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error during scheduled backup:`,
      error
    )
  }
}

// 监听定时器触发事件
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === BACKUP_ALARM_NAME) {
    await performBackup()
  }
})

// --- 卸载时设置跳转 URL ---
// 重要：这个 URL 应该指向一个你控制的网页，用于告知用户数据可能丢失，
// 或提供恢复方式（如果实现了云同步等）。
// 它不能直接触发本地文件保存。
const UNINSTALL_URL = "https://example.com/tab-manager-uninstalled" // !! 请替换为你自己的 URL !!

chrome.runtime.setUninstallURL(UNINSTALL_URL, () => {
  if (chrome.runtime.lastError) {
    console.error(
      "Error setting uninstall URL:",
      chrome.runtime.lastError.message
    )
  } else {
    console.log(`Uninstall URL set to: ${UNINSTALL_URL}`)
  }
})

// --- 插件安装或更新时 ---
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log(`Extension installed or updated. Reason: ${details.reason}`)

  // --- 创建或更新定时备份任务 ---
  // 先清除旧的定时器（以防 period 改变）
  await chrome.alarms.clear(BACKUP_ALARM_NAME)
  // 创建新的定时器，例如每 24 小时执行一次
  chrome.alarms.create(BACKUP_ALARM_NAME, {
    // delayInMinutes: 1, // 首次执行延迟 1 分钟 (可选)
    periodInMinutes: 60 * 24 // 1440 分钟 = 24 小时
  })
  console.log(
    `Backup alarm '${BACKUP_ALARM_NAME}' created/updated. Period: 24 hours.`
  )

  // 可选：在首次安装时执行一次备份
  if (details.reason === "install") {
    console.log("Performing initial backup on install...")
    await performBackup()
  }

  // 可选：在这里执行其他初始化操作，例如迁移旧数据格式等
})

// --- 保持 Service Worker 活跃 (如果需要，但通常事件驱动更好) ---
// MV3 Service Worker 是事件驱动的，通常不需要强制保持活跃。
// 如果确实遇到问题，可以考虑使用 chrome.alarms 或其他事件来定期唤醒。
// console.log("Background service worker started.");

// --- 消息监听器 (如果 Popup 或 Options 需要与 Background 通信) ---
/*
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received:", message);
  if (message.action === "getSomethingFromBackground") {
    // ... 处理逻辑 ...
    sendResponse({ data: "some data" });
    return true; // 表示异步响应
  }
});
*/
