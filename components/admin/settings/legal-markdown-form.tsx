'use client'

import { useTransition, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Scale } from 'lucide-react'
import { MilkdownMarkdownEditor } from '@/components/admin/curriculum/milkdown-editor'

interface LegalMarkdownFormProps {
  title: string
  description: string
  initialContent: string
  onSave: (markdown: string) => Promise<{ success: boolean; error?: string }>
}

export function LegalMarkdownForm({
  title,
  description,
  initialContent,
  onSave,
}: LegalMarkdownFormProps) {
  const [isPending, startTransition] = useTransition()
  const [content, setContent] = useState(initialContent)

  function handleSubmit() {
    startTransition(async () => {
      const result = await onSave(content)
      if (result.success) {
        toast.success('已儲存')
      } else {
        toast.error(result.error || '儲存失敗')
      }
    })
  }

  return (
    <Card className="bg-white border border-[#E5E5E5] rounded-xl">
      <CardHeader>
        <CardTitle className="text-[#0A0A0A] flex items-center gap-2">
          <Scale className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription className="text-[#525252]">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <MilkdownMarkdownEditor
          value={content}
          onChange={setContent}
          placeholder="使用 Markdown 語法編輯內容..."
        />

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-[#C41E3A] hover:bg-[#A01830] text-white rounded-full"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                儲存中...
              </>
            ) : (
              '儲存'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
