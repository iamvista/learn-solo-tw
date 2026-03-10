// components/admin/users/export-csv-button.tsx
// 匯出學員列表 CSV 按鈕
// 根據當前篩選條件匯出，並顯示篩選狀態提示

'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Download, Loader2, Filter } from 'lucide-react'
import { exportUsersCSV } from '@/lib/actions/users'

export function ExportCsvButton() {
  const searchParams = useSearchParams()
  const [isExporting, setIsExporting] = useState(false)

  const search = searchParams.get('search') ?? undefined
  const hasPurchase =
    (searchParams.get('hasPurchase') as 'all' | 'yes' | 'no') ?? undefined

  // 計算生效中的篩選條件數量
  let activeFilterCount = 0
  if (search) activeFilterCount++
  if (hasPurchase && hasPurchase !== 'all') activeFilterCount++

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const csv = await exportUsersCSV({ search, hasPurchase })

      // 加 BOM 讓 Excel 正確辨識 UTF-8
      const bom = '\uFEFF'
      const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)

      const today = new Date().toISOString().split('T')[0]
      const a = document.createElement('a')
      a.href = url
      a.download = `學員列表_${today}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('匯出 CSV 失敗:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {activeFilterCount > 0 && (
        <span className="flex items-center gap-1 text-xs text-[#F5A524] font-medium">
          <Filter className="h-3 w-3" />
          套用 {activeFilterCount} 項篩選條件
        </span>
      )}
      <Button
        variant="outline"
        onClick={handleExport}
        disabled={isExporting}
        className="border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg"
      >
        {isExporting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        匯出 CSV
      </Button>
    </div>
  )
}
