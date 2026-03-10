// lib/payment/shared.ts
// 金流共用工具函數

import crypto from 'crypto'

/**
 * 產生訂單編號
 * 格式: ORD + 日期(YYYYMMDD) + 時間戳後6位 + 6位隨機數
 * 總長度: 3 + 8 + 6 + 6 = 23 字元
 */
export function generateOrderNo(): string {
  const now = new Date()
  const dateStr =
    now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0')
  const timeStr = Date.now().toString().slice(-6)
  const randomBytes = crypto.randomBytes(3)
  const random = ((randomBytes[0]! << 16) + (randomBytes[1]! << 8) + randomBytes[2]!)
    .toString()
    .slice(-6)
    .padStart(6, '0')
  return `ORD${dateStr}${timeStr}${random}`
}
