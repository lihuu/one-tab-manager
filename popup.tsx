// popup.tsx
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty" // 非活动 Tab 图标

import SaveAltIcon from "@mui/icons-material/SaveAlt" // 保存图标

import SettingsIcon from "@mui/icons-material/Settings" // 设置/管理图标
import TabIcon from "@mui/icons-material/Tab" // 单个 Tab 图标
import { Box, Button, CircularProgress, Typography } from "@mui/material"
import React, { useState } from "react"

import { saveTabs } from "./storage" // 导入存储逻辑

/**
 * 插件 Popup 窗口组件
 */
function IndexPopup() {
  // 加载状态管理，null 表示无加载，'all', 'current', 'inactive' 表示对应按钮加载中
  const [loading, setLoading] = useState<string | null>(null)

  /**
   * 处理保存标签页的逻辑
   * @param type 保存类型: 'all' (所有), 'current' (当前), 'inactive' (非活动)
   */
  const handleSaveTabs = async (type: "all" | "current" | "inactive") => {
    setLoading(type) // 设置加载状态
    try {
      // 根据类型设置查询条件
      const tabsToQuery = buildTabsQuery(type)

      // 执行查询
      let tabs = await chrome.tabs.query(tabsToQuery)

      //
      if (type === "inactive") {
        tabs = tabs.filter((tab) => tab.discarded)
      }

      // 过滤掉无效或不需要保存的标签页 (例如新标签页)
      const filteredTabs = tabs.filter(
        (tab) =>
          tab.url && // 必须有 URL
          !tab.url.startsWith("chrome://newtab")
      )

      // 如果有需要保存的标签页
      if (filteredTabs.length > 0) {
        // 提取需要的数据
        const tabsData = filteredTabs.map((tab) => ({
          url: tab.url!, // url 已在 filter 中确认存在
          title: tab.title || "No Title", // 如果没有标题，使用默认值
          favIconUrl: tab.favIconUrl // 获取网站图标 URL
        }))
        // 调用保存函数
        await saveTabs(tabsData)

        const tabsToCloseIds = filteredTabs.map((tab) => tab.id!)

        console.log(`Successfully saved ${tabsData.length} tabs.`) // 添加成功日志

        // --- 新增：关闭已保存的标签页 ---
        if (tabsToCloseIds.length > 0) {
          await chrome.tabs.remove(tabsToCloseIds)
          console.log(`Closed ${tabsToCloseIds.length} tabs.`) // 添加关闭日志
        }

        // ------------------------------
      } else {
        console.log("No tabs to save for type:", type)
        // TODO: 添加用户反馈 (例如：短暂显示无内容消息)
      }
    } catch (error) {
      console.error("Error saving tabs:", error)
      // TODO: 添加用户反馈 (例如：显示错误消息)
    } finally {
      setLoading(null) // 清除加载状态
    }
  }

  /**
   * 打开插件的选项页面 (管理页面)
   */
  const openOptionsPage = () => {
    chrome.runtime.openOptionsPage()
  }

  return (
    // 使用 Material UI 的 Box 组件作为容器
    <Box sx={{ width: 280, p: 2, fontFamily: "Inter, sans-serif" }}>
      {/* 标题 */}
      <Typography variant="h6" gutterBottom>
        标签页管理器
      </Typography>
      {/* 按钮组 */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {/* 一键收取所有 */}
        <Button
          variant="contained" // 主要按钮样式
          startIcon={
            loading === "all" ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <SaveAltIcon />
            )
          } // 根据加载状态显示图标或加载指示器
          onClick={() => handleSaveTabs("all")}
          disabled={!!loading} // 如果有任何按钮在加载，则禁用所有按钮
        >
          {loading === "all" ? "保存中..." : "一键收取所有标签页"}
        </Button>
        {/* 收取当前 */}
        <Button
          variant="outlined" // 次要按钮样式
          startIcon={
            loading === "current" ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <TabIcon />
            )
          }
          onClick={() => handleSaveTabs("current")}
          disabled={!!loading}>
          {loading === "current" ? "保存中..." : "收取当前标签页"}
        </Button>
        {/* 收取非活动 */}
        <Button
          variant="outlined"
          startIcon={
            loading === "inactive" ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <HourglassEmptyIcon />
            )
          }
          onClick={() => handleSaveTabs("inactive")}
          disabled={!!loading}
          title="收取所有窗口中的非活动标签页" // 鼠标悬停提示
        >
          {loading === "inactive" ? "保存中..." : "收取非活动标签页"}
        </Button>

        {/* 打开管理页面 */}
        <Button
          variant="text" // 文本按钮样式
          startIcon={<SettingsIcon />}
          onClick={openOptionsPage}
          sx={{ mt: 1 }} // 顶部外边距
        >
          管理已保存的标签页
        </Button>
      </Box>
    </Box>
  )

  function buildTabsQuery(type: string): chrome.tabs.QueryInfo {
    switch (type) {
      case "current":
        // 查询当前窗口的活动标签页
        return { active: true, currentWindow: true }
      case "inactive":
        // 查询所有普通窗口中的非活动标签页
        // 注意: Chrome 没有直接的 'inactive' 状态，这里使用 active: false
        // 这里的 inactive 应该是指 chrome 浏览器新增加的功能，常时间不活动的页面会自动释放内存
        return { active: false, windowType: "normal" }
      case "all":
      default:
        // 查询所有普通窗口的所有标签页
        return { windowType: "normal" }
    }
  }
}

export default IndexPopup
