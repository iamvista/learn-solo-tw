'use client'

import { LegalMarkdownForm } from '@/components/admin/settings/legal-markdown-form'
import { updateLegalPrivacy } from '@/lib/actions/settings'

interface PrivacyEditorClientProps {
  initialContent: string
}

export function PrivacyEditorClient({ initialContent }: PrivacyEditorClientProps) {
  return (
    <LegalMarkdownForm
      title="隱私權政策"
      description="使用 Markdown 編輯隱私權政策內容，儲存後將顯示在 /privacy 頁面。"
      initialContent={initialContent}
      onSave={updateLegalPrivacy}
    />
  )
}
