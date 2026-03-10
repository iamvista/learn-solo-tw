// lib/posthog-server.ts
// Server-side PostHog client for tracking events in API routes and server actions
// Reads PostHog settings from database

import { PostHog } from 'posthog-node'
import { getAnalyticsSettings } from '@/lib/analytics-settings'

let posthogClient: PostHog | null = null
let currentKey: string | null = null

export async function getPostHogClient(): Promise<PostHog | null> {
  const settings = await getAnalyticsSettings()

  if (!settings.posthogKey) {
    return null
  }

  // 如果 key 變了，重新建立 client
  if (posthogClient && currentKey !== settings.posthogKey) {
    await posthogClient.shutdown()
    posthogClient = null
  }

  if (!posthogClient) {
    posthogClient = new PostHog(settings.posthogKey, {
      host: settings.posthogHost || 'https://us.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    })
    currentKey = settings.posthogKey

    if (process.env.NODE_ENV === 'development') {
      posthogClient.debug(true)
    }
  }

  return posthogClient
}

export async function shutdownPostHog() {
  if (posthogClient) {
    await posthogClient.shutdown()
  }
}
