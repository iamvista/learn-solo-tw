// components/admin/courses/course-filters.tsx
// 課程搜尋和篩選元件

'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, X, Loader2 } from 'lucide-react'
import { courseStatusOptions } from '@/lib/validations/course'

// 加入「全部」選項
const statusFilterOptions = [
  { value: 'ALL', label: '全部狀態' },
  ...courseStatusOptions,
]

export function CourseFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // 初始化搜尋值
  const [searchValue, setSearchValue] = useState(
    searchParams.get('search') ?? ''
  )
  const currentStatus = searchParams.get('status') ?? 'ALL'

  // 更新 URL 參數
  const updateFilters = useCallback(
    (params: { search?: string; status?: string; page?: string }) => {
      startTransition(() => {
        const newParams = new URLSearchParams(searchParams.toString())

        // 更新搜尋
        if (params.search !== undefined) {
          if (params.search) {
            newParams.set('search', params.search)
          } else {
            newParams.delete('search')
          }
          // 搜尋變更時重置頁碼
          newParams.delete('page')
        }

        // 更新狀態篩選
        if (params.status !== undefined) {
          if (params.status && params.status !== 'ALL') {
            newParams.set('status', params.status)
          } else {
            newParams.delete('status')
          }
          // 狀態變更時重置頁碼
          newParams.delete('page')
        }

        // 更新頁碼
        if (params.page !== undefined) {
          if (params.page && params.page !== '1') {
            newParams.set('page', params.page)
          } else {
            newParams.delete('page')
          }
        }

        const queryString = newParams.toString()
        router.push(`/admin/courses${queryString ? `?${queryString}` : ''}`)
      })
    },
    [router, searchParams]
  )

  // 處理搜尋提交
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters({ search: searchValue })
  }

  // 處理狀態篩選變更
  const handleStatusChange = (value: string) => {
    updateFilters({ status: value })
  }

  // 清除所有篩選
  const handleClearFilters = () => {
    setSearchValue('')
    startTransition(() => {
      router.push('/admin/courses')
    })
  }

  // 檢查是否有任何篩選條件
  const hasFilters = searchParams.get('search') || searchParams.get('status')

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* 搜尋欄 */}
      <form onSubmit={handleSearch} className="flex-1 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A3A3A3]" />
          <Input
            type="text"
            placeholder="搜尋課程標題..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-10 bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] rounded-lg"
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          disabled={isPending}
          className="border-[#E5E5E5] text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] rounded-lg"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            '搜尋'
          )}
        </Button>
      </form>

      {/* 狀態篩選 */}
      <div className="flex gap-2">
        <Select value={currentStatus} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[140px] bg-white border-[#E5E5E5] text-[#0A0A0A] rounded-lg">
            <SelectValue placeholder="選擇狀態" />
          </SelectTrigger>
          <SelectContent className="bg-white border-[#E5E5E5] rounded-lg">
            {statusFilterOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="text-[#0A0A0A] focus:bg-[#FAFAFA] focus:text-[#0A0A0A]"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 清除篩選按鈕 */}
        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClearFilters}
            className="text-[#525252] hover:text-[#0A0A0A] hover:bg-[#FAFAFA] rounded-lg"
            title="清除篩選"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
