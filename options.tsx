// options.tsx
import DeleteIcon from "@mui/icons-material/Delete" // 删除图标

import OpenInNewIcon from "@mui/icons-material/OpenInNew" // 打开新标签页图标
import SearchIcon from "@mui/icons-material/Search" // 搜索图标
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Pagination,
  Paper,
  TextField,
  Tooltip,
  Typography
} from "@mui/material"
import { formatDistanceToNow } from "date-fns" // 用于相对时间格式化
import { zhCN } from "date-fns/locale" // 导入中文语言包 for date-fns
import React, { useCallback, useEffect, useMemo, useState } from "react"

import { deleteTab, getSavedTabs } from "./storage" // 导入存储逻辑
import type { SavedTab } from "./types" // 导入类型定义

// --- 配置项 ---
const ITEMS_PER_PAGE = 20 // 每页显示的条目数量

/**
 * 插件选项页面组件 (用于管理已保存的标签页)
 */
function OptionsPage() {
  // --- State Hooks ---
  const [allTabs, setAllTabs] = useState<SavedTab[]>([]) // 存储从 storage 加载的所有标签页
  const [filteredTabs, setFilteredTabs] = useState<SavedTab[]>([]) // 当前显示（搜索过滤后）的标签页
  const [searchTerm, setSearchTerm] = useState("") // 搜索框的输入值
  const [currentPage, setCurrentPage] = useState(1) // 当前页码
  const [loading, setLoading] = useState(true) // 数据加载状态
  const [error, setError] = useState<string | null>(null) // 错误信息

  // --- Callbacks ---
  /**
   * 从 chrome.storage.local 加载标签页数据
   */
  const fetchTabs = useCallback(async () => {
    setLoading(true) // 开始加载
    setError(null) // 清除旧错误
    try {
      const tabs = await getSavedTabs() // 调用 storage 函数获取数据 (已排序)
      setAllTabs(tabs) // 更新所有标签页状态
      setFilteredTabs(tabs) // 初始时，过滤结果即为所有结果
    } catch (err) {
      console.error("Error fetching tabs:", err)
      setError("加载标签页失败，请稍后重试。") // 设置错误信息
      setAllTabs([]) // 清空数据
      setFilteredTabs([])
    } finally {
      setLoading(false) // 结束加载
    }
  }, []) // 空依赖数组，表示此函数本身不会改变

  /**
   * 处理删除标签页的操作
   * @param tabId 要删除的标签页 ID
   */
  const handleDelete = async (tabId: string) => {
    // --- 乐观更新 UI ---
    // 假设删除会成功，立即从 allTabs 和 filteredTabs 中移除该项
    setAllTabs((prevTabs) => prevTabs.filter((tab) => tab.id !== tabId))
    // setFilteredTabs(prevTabs => prevTabs.filter(tab => tab.id !== tabId)); // filterTabs 会在 allTabs 更新后自动重新计算

    try {
      // 调用 storage 函数执行实际删除操作
      await deleteTab(tabId)
      // 可选：显示成功消息
    } catch (err) {
      console.error("Error deleting tab:", err)
      setError("删除失败，请刷新后重试。") // 设置错误信息
      // --- 回滚 UI ---
      // 如果删除失败，重新加载数据以恢复到之前的状态
      fetchTabs()
    }
  }

  /**
   * 处理分页变化的函数
   */
  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setCurrentPage(value) // 更新当前页码
    window.scrollTo(0, 0) // 切换页面后将视口滚动到顶部
  }

  /**
   * 格式化时间戳为相对时间 (例如："5分钟前")
   * @param timestamp 时间戳 (毫秒)
   * @returns 格式化后的字符串
   */
  const formatRelativeTime = (timestamp: number) => {
    try {
      // 使用 date-fns 进行格式化，并添加中文后缀
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
        locale: zhCN
      })
    } catch (e) {
      console.error("Error formatting date:", e)
      // 如果格式化失败，提供一个备用格式
      return new Date(timestamp).toLocaleString("zh-CN")
    }
  }

  // --- Effects ---
  // 组件挂载时加载初始数据
  useEffect(() => {
    fetchTabs()
  }, [fetchTabs]) // 依赖 fetchTabs 函数

  // 当搜索词或所有标签页数据变化时，更新过滤后的标签页列表
  useEffect(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim() // 转换为小写并去除首尾空格

    // 如果搜索词为空，显示所有标签页
    if (!lowerCaseSearchTerm) {
      setFilteredTabs(allTabs)
      // setCurrentPage(1); // 搜索清空时是否回到第一页，根据需求决定，暂时注释掉
      return
    }

    // --- 搜索逻辑 ---
    // 过滤 allTabs，查找标题或 URL 包含搜索词的项
    // 注意：对于非常大的数据集 (>10k)，这里的性能可能需要优化 (Debounce, Web Worker)
    const results = allTabs.filter(
      (tab) =>
        tab.title.toLowerCase().includes(lowerCaseSearchTerm) || // 匹配标题
        tab.url.toLowerCase().includes(lowerCaseSearchTerm) // 匹配 URL
    )
    setFilteredTabs(results) // 更新过滤后的列表
    setCurrentPage(1) // 每次执行新搜索时，都重置到第一页
  }, [searchTerm, allTabs]) // 依赖搜索词和所有标签页数据

  // --- Memos ---
  // 计算当前页需要显示的标签页 (分页)
  const paginatedTabs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE // 计算起始索引
    const endIndex = startIndex + ITEMS_PER_PAGE // 计算结束索引
    return filteredTabs.slice(startIndex, endIndex) // 从过滤结果中截取当前页的数据
  }, [filteredTabs, currentPage]) // 依赖过滤结果和当前页码

  // 计算总页数
  const pageCount = useMemo(() => {
    return Math.ceil(filteredTabs.length / ITEMS_PER_PAGE) // 总条目数除以每页条目数，向上取整
  }, [filteredTabs.length]) // 依赖过滤结果的长度

  // --- Render ---
  return (
    <Box
      sx={{
        maxWidth: 900,
        margin: "auto",
        p: { xs: 1, sm: 2, md: 3 },
        fontFamily: "Inter, sans-serif"
      }}>
      {/* 页面主标题 */}
      <Typography variant="h4" gutterBottom component="h1" sx={{ mb: 3 }}>
        已保存的标签页
      </Typography>

      {/* 搜索框容器 */}
      <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <TextField
          fullWidth // 占满容器宽度
          variant="outlined"
          placeholder="搜索标题或 URL..." // 提示文字
          value={searchTerm} // 绑定搜索词状态
          onChange={(e) => setSearchTerm(e.target.value)} // 更新搜索词状态
          InputProps={{
            // 在输入框开头添加搜索图标
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            sx: { borderRadius: 1 } // 输入框圆角
          }}
        />
      </Paper>

      {/* --- 内容区域 --- */}
      {loading ? ( // 如果正在加载，显示加载指示器
        <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
          <CircularProgress />
        </Box>
      ) : error ? ( // 如果有错误，显示错误信息
        <Typography color="error" sx={{ textAlign: "center", p: 3 }}>
          {error}
        </Typography>
      ) : filteredTabs.length === 0 ? ( // 如果没有数据（或搜索无结果）
        <Typography sx={{ textAlign: "center", p: 3, color: "text.secondary" }}>
          {searchTerm
            ? "未找到匹配的标签页。"
            : "还没有保存任何标签页，快去 Popup 保存吧！"}
        </Typography>
      ) : (
        // 正常显示列表和分页
        <>
          {/* 标签页列表 */}
          <List
            sx={{
              bgcolor: "background.paper",
              borderRadius: 2,
              boxShadow: 1,
              mb: 2
            }}>
            {paginatedTabs.map((tab, index) => (
              // 使用 React.Fragment 来避免不必要的 DOM 元素，并允许添加 Divider
              <React.Fragment key={tab.id}>
                <ListItem
                  alignItems="flex-start" // 垂直对齐方式
                  secondaryAction={
                    // 列表项右侧的操作按钮区域
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      {/* 打开链接按钮 */}
                      <Tooltip title="在新标签页中打开">
                        <IconButton
                          edge="end"
                          aria-label="open tab"
                          href={tab.url} // 设置链接地址
                          target="_blank" // 在新标签页打开
                          rel="noopener noreferrer" // 安全措施
                          size="small">
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {/* 删除按钮 */}
                      <Tooltip title="删除此项">
                        <IconButton
                          edge="end"
                          aria-label="delete tab"
                          onClick={() => handleDelete(tab.id)} // 绑定删除事件
                          color="error" // 红色表示删除
                          size="small">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                  sx={{
                    "&:hover": { bgcolor: "action.hover" },
                    transition: "background-color 0.2s"
                  }} // 悬停效果
                >
                  {/* 网站图标 */}
                  <ListItemAvatar sx={{ minWidth: 32, mt: 0.5, mr: 1.5 }}>
                    <Avatar
                      sx={{
                        width: 20,
                        height: 20,
                        bgcolor: "transparent",
                        borderRadius: "3px"
                      }} // 设置图标大小和样式
                      variant="square" // 使用方形 Avatar 以更好显示 favicon
                      src={tab.favIconUrl} // 设置图标 URL
                      alt=" " // 空 alt，避免屏幕阅读器读出 URL
                    >
                      {/* Fallback: 如果图标加载失败或不存在，显示一个灰色方块 */}
                      <Box
                        sx={{
                          width: "100%",
                          height: "100%",
                          bgcolor: "grey.200",
                          borderRadius: "3px"
                        }}
                      />
                    </Avatar>
                  </ListItemAvatar>
                  {/* 文本内容 */}
                  <ListItemText
                    primary={
                      // 主要文本 (标题)
                      <Link
                        href={tab.url} // 链接到标签页 URL
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover" // 鼠标悬停时显示下划线
                        color="text.primary" // 使用主题的主文本颜色
                        sx={{
                          display: "block", // 块级显示
                          wordBreak: "break-all", // 长单词或 URL 强制换行
                          fontWeight: 500 // 稍粗字体
                        }}
                        title={tab.url} // 鼠标悬停时显示完整 URL
                      >
                        {tab.title || tab.url} {/* 如果没有标题，则显示 URL */}
                      </Link>
                    }
                    secondary={
                      // 次要文本 (保存时间)
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary">
                        {formatRelativeTime(tab.savedAt)} {/* 显示相对时间 */}
                      </Typography>
                    }
                  />
                </ListItem>
                {/* 在列表项之间添加分隔线 (除了最后一项) */}
                {index < paginatedTabs.length - 1 && (
                  <Divider variant="inset" component="li" />
                )}
              </React.Fragment>
            ))}
          </List>

          {/* 分页控件 */}
          {pageCount > 1 && ( // 只有当总页数大于 1 时才显示分页
            <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
              <Pagination
                count={pageCount} // 总页数
                page={currentPage} // 当前页码
                onChange={handlePageChange} // 绑定页面变化事件
                color="primary" // 使用主题色
                shape="rounded" // 圆角形状
                // showFirstButton // 显示首页按钮 (可选)
                // showLastButton // 显示末页按钮 (可选)
              />
            </Box>
          )}
        </>
      )}
    </Box>
  )
}

export default OptionsPage
