---
name: manage-faq
description: >
  管理課程銷售頁的 FAQ（常見問題）內容。
  Use when: 用戶說「新增 FAQ」、「修改 FAQ」、「管理常見問題」、「更新 FAQ」、
  「添加問答」、「編輯問題」、「manage FAQ」、「add FAQ」、「update FAQ」。
  涵蓋全局 FAQ 和課程專屬 FAQ 兩種模式。
---

# Manage FAQ

## FAQ 系統架構

本平臺 FAQ 為**程式碼層級的靜態內容**（非資料庫），分兩種：

| 類型 | 位置 | 使用方式 |
|------|------|----------|
| 全局 FAQ | `lib/constants/faq.ts` | 由 `FAQSection` 元件讀取，多課程共用 |
| 課程專屬 FAQ | 寫在各課程的 `components/main/landing/pages/{slug}.tsx` 內 | 僅該課程使用 |

## Workflow

### 1. 確認操作類型

向用戶確認：
- **修改全局 FAQ**：編輯 `lib/constants/faq.ts` 的 `courseFAQs` 陣列
- **修改課程專屬 FAQ**：找到對應的銷售頁元件，編輯內嵌的 FAQ 陣列
- **新增課程專屬 FAQ**：在銷售頁元件中建立獨立的 FAQ section

### 2. 修改全局 FAQ

編輯 `lib/constants/faq.ts`：

```ts
export interface FAQItem {
  question: string
  answer: string
}

export const courseFAQs: FAQItem[] = [
  {
    question: '問題文字',
    answer: '回答文字',
  },
]
```

注意：修改全局 FAQ 會影響**所有使用 `<FAQSection />` 的銷售頁**。

### 3. 課程專屬 FAQ

在 `components/main/landing/pages/{slug}.tsx` 中建立獨立 FAQ 區塊：

```tsx
function CourseFAQSection() {
  const faqs = [
    { question: '問題一', answer: '回答一' },
  ]

  return (
    <section className="bg-white py-12 sm:py-16 lg:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold tracking-tight text-[#0A0A0A] sm:text-3xl">
          常見問題
        </h2>
        <div className="mt-8 space-y-4">
          {faqs.map((faq, index) => (
            <details key={index} className="group rounded-lg border border-[#E5E5E5] p-4">
              <summary className="cursor-pointer font-medium text-[#0A0A0A]">
                {faq.question}
              </summary>
              <p className="mt-3 text-[#525252]">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
```

也可使用 shadcn Accordion（與全局 FAQSection 風格一致），從 `@/components/ui/accordion` 匯入。

### 4. 聯繫 Email

全局 `FAQSection` 底部的聯繫 email 寫在 `components/main/landing/faq-section.tsx` 中，直接編輯即可。

## 注意事項

- 全局 FAQ 內容是特定課程導向的，不同課程建議用**課程專屬 FAQ**
- `FAQSection` 元件不接受 props，無法傳入自訂 FAQ
- FAQ 無後臺管理介面，所有修改都在程式碼層級
