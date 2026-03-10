// hooks/use-progress.ts
// 進度追蹤 Hook
// 封裝進度更新邏輯，自動 debounce 和 beforeunload 處理

'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { ProgressResponse } from '@/lib/validations/progress'
import posthog from 'posthog-js'

/**
 * 進度追蹤 Hook 配置
 */
interface UseProgressOptions {
  /** 單元 ID */
  lessonId: string
  /** 影片總時長（秒） */
  videoDuration?: number | null
  /** Debounce 間隔（毫秒），預設 5000ms */
  debounceMs?: number
  /** 完成閾值（百分比），預設 90% */
  completeThreshold?: number
  /** 進度更新回調 */
  onProgressUpdate?: (response: ProgressResponse) => void
  /** 完成回調 */
  onComplete?: () => void
}

/**
 * 進度追蹤 Hook 回傳值
 */
interface UseProgressReturn {
  /** 更新進度（會自動 debounce） */
  updateProgress: (watchedSec: number, forceComplete?: boolean) => void
  /** 強制立即上報進度 */
  flushProgress: () => Promise<void>
  /** 標記為已完成 */
  markComplete: () => Promise<void>
}

/**
 * 進度追蹤 Hook
 * 提供自動 debounce、beforeunload 處理的進度上報功能
 */
export function useProgress({
  lessonId,
  videoDuration,
  debounceMs = 5000,
  completeThreshold = 90,
  onProgressUpdate,
  onComplete,
}: UseProgressOptions): UseProgressReturn {
  // 最新進度狀態
  const latestProgressRef = useRef<{
    watchedSec: number
    completed: boolean
    dirty: boolean
  }>({
    watchedSec: 0,
    completed: false,
    dirty: false,
  })

  // Debounce 計時器
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 是否已經標記完成（防止重複觸發）
  const hasMarkedCompleteRef = useRef(false)

  // 失敗重試計數器
  const retryCountRef = useRef(0)
  const MAX_RETRIES = 3
  const RETRY_DELAY = 2000

  /**
   * 發送進度到 API（含重試機制）
   */
  const sendProgress = useCallback(async (
    watchedSec: number,
    completed: boolean,
    isRetry = false
  ): Promise<ProgressResponse> => {
    try {
      const response = await fetch('/api/lesson-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonId,
          watchedSec,
          completed,
        }),
      })

      const data: ProgressResponse = await response.json()

      // 成功時重置重試計數
      if (data.success) {
        retryCountRef.current = 0

        // PostHog: Track progress update (only on success to reduce event volume)
        // Note: We only track significant progress updates, not every heartbeat
        if (completed) {
          posthog.capture('lesson_progress_updated', {
            lesson_id: lessonId,
            watched_seconds: watchedSec,
            completed: completed,
          })
        }
      } else if (!isRetry && retryCountRef.current < MAX_RETRIES) {
        // 失敗時自動重試（非重試請求且未超過最大重試次數）
        retryCountRef.current++
        console.warn(`進度上報失敗，${RETRY_DELAY}ms 後重試 (${retryCountRef.current}/${MAX_RETRIES})`)
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
        return sendProgress(watchedSec, completed, true)
      }

      return data
    } catch (error) {
      console.error('進度上報失敗:', error)

      // 網路錯誤時嘗試重試
      if (!isRetry && retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++
        console.warn(`網路錯誤，${RETRY_DELAY}ms 後重試 (${retryCountRef.current}/${MAX_RETRIES})`)
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
        return sendProgress(watchedSec, completed, true)
      }

      return { success: false, error: '網路錯誤，請檢查網路連線' }
    }
  }, [lessonId])

  /**
   * 立即上報進度（不經過 debounce）
   */
  const flushProgress = useCallback(async (): Promise<void> => {
    // 清除 debounce 計時器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    // 如果沒有待上報的變更，跳過
    if (!latestProgressRef.current.dirty) {
      return
    }

    const { watchedSec, completed } = latestProgressRef.current
    latestProgressRef.current.dirty = false

    const response = await sendProgress(watchedSec, completed)
    onProgressUpdate?.(response)

    // 如果標記完成且成功，觸發完成回調
    if (completed && response.success && !hasMarkedCompleteRef.current) {
      hasMarkedCompleteRef.current = true
      onComplete?.()
    }
  }, [sendProgress, onProgressUpdate, onComplete])

  /**
   * 更新進度（自動 debounce）
   * 注意：只保留最大觀看時間，避免倒帶時進度回退
   */
  const updateProgress = useCallback((
    watchedSec: number,
    forceComplete = false
  ): void => {
    // 只保留最大觀看時間，避免倒帶時進度回退
    const maxWatchedSec = Math.max(
      latestProgressRef.current.watchedSec,
      watchedSec
    )

    // 計算是否達到完成閾值（基於最大觀看時間）
    let completed = forceComplete || latestProgressRef.current.completed
    if (!completed && videoDuration && videoDuration > 0) {
      const percentage = (maxWatchedSec / videoDuration) * 100
      completed = percentage >= completeThreshold
    }

    // 更新最新進度狀態
    latestProgressRef.current = {
      watchedSec: maxWatchedSec,
      completed,
      dirty: true,
    }

    // 清除現有的 debounce 計時器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // 設定新的 debounce 計時器
    debounceTimerRef.current = setTimeout(() => {
      flushProgress()
    }, debounceMs)
  }, [videoDuration, completeThreshold, debounceMs, flushProgress])

  /**
   * 標記為已完成
   */
  const markComplete = useCallback(async (): Promise<void> => {
    // 如果已經標記過，跳過
    if (hasMarkedCompleteRef.current) {
      return
    }

    // 清除 debounce 計時器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    const watchedSec = videoDuration || latestProgressRef.current.watchedSec
    latestProgressRef.current = {
      watchedSec,
      completed: true,
      dirty: false,
    }

    const response = await sendProgress(watchedSec, true)
    onProgressUpdate?.(response)

    if (response.success) {
      hasMarkedCompleteRef.current = true
      onComplete?.()
    }
  }, [videoDuration, sendProgress, onProgressUpdate, onComplete])

  /**
   * 處理視窗關閉事件
   * 使用 sendBeacon 確保進度被送出
   */
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!latestProgressRef.current.dirty) {
        return
      }

      const { watchedSec, completed } = latestProgressRef.current

      // 使用 sendBeacon API 確保資料被送出
      // 即使頁面正在關閉也能可靠地送出
      // 注意：需要使用 Blob 並設定 Content-Type，否則伺服器無法解析 JSON
      const data = JSON.stringify({
        lessonId,
        watchedSec,
        completed,
      })

      const blob = new Blob([data], { type: 'application/json' })
      navigator.sendBeacon('/api/lesson-progress', blob)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [lessonId])

  /**
   * 處理頁面可見性變化
   * 當頁面變為隱藏時上報進度
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushProgress()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [flushProgress])

  /**
   * 清理 debounce 計時器
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  /**
   * 當 lessonId 變更時，重置狀態
   */
  useEffect(() => {
    latestProgressRef.current = {
      watchedSec: 0,
      completed: false,
      dirty: false,
    }
    hasMarkedCompleteRef.current = false
  }, [lessonId])

  return {
    updateProgress,
    flushProgress,
    markComplete,
  }
}
