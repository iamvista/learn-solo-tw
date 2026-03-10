// lib/actions/posthog-analytics.ts
// PostHog API 查詢 Server Actions
// 透過 PostHog Query API 取得漏斗和趨勢資料

'use server'

import { requireAdminAuth } from '@/lib/require-admin'
import type { FunnelStep } from '@/lib/actions/analytics'
import { getAnalyticsSettings } from '@/lib/analytics-settings'

// requireAdminAuth 從 @/lib/require-admin 引入（直接查 DB 確保角色即時生效）

/**
 * 呼叫 PostHog Query API
 */
async function queryPostHog(query: Record<string, unknown>): Promise<unknown> {
  const settings = await getAnalyticsSettings()

  console.log('[PostHog] Settings check:', {
    hasPersonalApiKey: !!settings.posthogPersonalApiKey,
    keyPrefix: settings.posthogPersonalApiKey?.slice(0, 8) || '(empty)',
    posthogHost: settings.posthogHost || '(default: us.i.posthog.com)',
    hasPosthogKey: !!settings.posthogKey,
  })

  if (!settings.posthogPersonalApiKey) {
    throw new Error('PostHog Personal API Key 未設定')
  }

  const host = settings.posthogHost || 'https://us.i.posthog.com'
  const url = `${host}/api/environments/@current/query/`

  console.log('[PostHog] Querying:', url)
  console.log('[PostHog] Query body:', JSON.stringify(query, null, 2))

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.posthogPersonalApiKey}`,
    },
    body: JSON.stringify({ query }),
    next: { revalidate: 300 }, // 快取 5 分鐘
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error('[PostHog] API error response:', { status: res.status, body: errorText })
    throw new Error(`PostHog API error (${res.status}): ${errorText}`)
  }

  const data = await res.json()
  console.log('[PostHog] Raw API response:', JSON.stringify(data, null, 2).slice(0, 2000))
  return data
}

/**
 * 取得轉換漏斗數據（PostHog Funnel Query）
 * 瀏覽網頁 → 點擊 CTA → 建立訂單 → 付款成功
 */
export async function getPostHogFunnel(days: number = 30): Promise<FunnelStep[]> {
  await requireAdminAuth()

  try {
    const result = await queryPostHog({
      kind: 'FunnelsQuery',
      series: [
        { kind: 'EventsNode', event: '$pageview', custom_name: '瀏覽網頁' },
        { kind: 'EventsNode', event: 'cta_clicked', custom_name: '點擊 CTA' },
        { kind: 'EventsNode', event: 'checkout_initiated', custom_name: '建立訂單' },
        { kind: 'EventsNode', event: 'payment_succeeded', custom_name: '付款成功' },
      ],
      dateRange: { date_from: `-${days}d` },
      funnelsFilter: {
        funnelWindowInterval: days,
        funnelWindowIntervalUnit: 'day',
        funnelOrderType: 'ordered',
        funnelVizType: 'steps',
      },
    }) as PostHogFunnelResponse

    console.log('[PostHog] Funnel result type:', typeof result.results, Array.isArray(result.results))
    console.log('[PostHog] Funnel result.results:', JSON.stringify(result.results, null, 2)?.slice(0, 2000))

    if (!result.results || !Array.isArray(result.results)) {
      console.warn('[PostHog] No results or not an array, returning empty. Full result keys:', Object.keys(result))
      return []
    }

    // 轉換為 FunnelStep 格式
    const firstStepCount = result.results[0]?.count || 1
    const steps: FunnelStep[] = result.results.map(
      (step: PostHogFunnelStep, index: number) => {
        const prevStepCount = index > 0 ? result.results[index - 1]?.count || 1 : step.count

        return {
          name: step.custom_name || step.name,
          count: step.count,
          conversionRate:
            index === 0
              ? 100
              : Math.round((step.count / prevStepCount) * 1000) / 10,
          overallConversionRate:
            index === 0
              ? 100
              : Math.round((step.count / firstStepCount) * 1000) / 10,
        }
      }
    )

    return steps
  } catch (error) {
    console.error('[PostHog] Funnel query failed:', error)
    return []
  }
}

// PostHog API response types
interface PostHogFunnelStep {
  action_id: string
  name: string
  custom_name?: string
  order: number
  count: number
  type: string
  average_conversion_time: number | null
  median_conversion_time: number | null
}

interface PostHogFunnelResponse {
  results: PostHogFunnelStep[]
}
