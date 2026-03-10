'use client'

import { LegalMarkdownForm } from '@/components/admin/settings/legal-markdown-form'
import { updateLegalTerms } from '@/lib/actions/settings'

interface TermsEditorClientProps {
  initialContent: string
}

export function TermsEditorClient({ initialContent }: TermsEditorClientProps) {
  return (
    <LegalMarkdownForm
      title="服務條款"
      description="使用 Markdown 編輯服務條款內容，儲存後將顯示在 /terms 頁面。"
      initialContent={initialContent}
      onSave={updateLegalTerms}
    />
  )
}
