// components/admin/curriculum/milkdown-editor.tsx
// Milkdown WYSIWYG Markdown 編輯器
// 支援 WYSIWYG / 原始 Markdown 雙模式切換
// 內建時間戳 (timestamp) 自訂 inline node

'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/kit/core'
import { commonmark, toggleStrongCommand, toggleEmphasisCommand, wrapInHeadingCommand, wrapInBlockquoteCommand, wrapInBulletListCommand, wrapInOrderedListCommand, toggleInlineCodeCommand, insertHrCommand, toggleLinkCommand } from '@milkdown/kit/preset/commonmark'
import { history } from '@milkdown/kit/plugin/history'
import { Milkdown, MilkdownProvider, useEditor, useInstance } from '@milkdown/react'
import { callCommand, replaceAll } from '@milkdown/kit/utils'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Bold,
  Italic,
  Link,
  Code,
  List,
  ListOrdered,
  Quote,
  Minus,
  Clock,
  Eye,
  PenLine,
  ChevronDown,
  FileCode2,
} from 'lucide-react'
import {
  timestampNode,
  timestampInputRule,
  insertTimestampCommand,
  remarkTimestampPlugin,
  formatSeconds,
} from './milkdown-timestamp-plugin'

// ==================== Types ====================

interface MilkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** 當此 key 改變時，WYSIWYG editor 會重新掛載（例如傳 lessonId） */
  editorKey?: string
}

type EditorMode = 'wysiwyg' | 'markdown'
type BlockType = 'paragraph' | 'h1' | 'h2' | 'h3'

// ==================== Timestamp Popover ====================

function TimestampPopover({
  onInsert,
  disabled,
}: {
  onInsert: (seconds: number, display: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [minutes, setMinutes] = useState('')
  const [seconds, setSeconds] = useState('')

  const handleInsert = () => {
    const mins = parseInt(minutes || '0', 10)
    const secs = parseInt(seconds || '0', 10)
    const totalSeconds = mins * 60 + secs
    const display = formatSeconds(totalSeconds)
    onInsert(totalSeconds, display)
    setMinutes('')
    setSeconds('')
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleInsert()
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-8 px-2 gap-1 text-[#525252] hover:text-[#0A0A0A] hover:bg-white"
          title="插入時間戳"
        >
          <Clock className="h-4 w-4" />
          <span className="text-xs">時間戳</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <div className="text-sm font-medium text-[#0A0A0A]">插入時間戳</div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-xs text-[#525252] mb-1 block">分鐘</label>
              <input
                type="number"
                min="0"
                max="999"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="00"
                className="w-full h-8 px-2 text-sm border border-[#E5E5E5] rounded-md bg-white text-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#C41E3A]"
                autoFocus
              />
            </div>
            <span className="text-lg font-bold text-[#525252] mt-4">:</span>
            <div className="flex-1">
              <label className="text-xs text-[#525252] mb-1 block">秒數</label>
              <input
                type="number"
                min="0"
                max="59"
                value={seconds}
                onChange={(e) => setSeconds(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="00"
                className="w-full h-8 px-2 text-sm border border-[#E5E5E5] rounded-md bg-white text-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#C41E3A]"
              />
            </div>
          </div>
          <div className="text-xs text-[#A3A3A3]">
            預覽：▶{' '}
            {formatSeconds(
              (parseInt(minutes || '0', 10)) * 60 +
                parseInt(seconds || '0', 10)
            )}
          </div>
          <Button
            size="sm"
            onClick={handleInsert}
            className="w-full bg-[#C41E3A] hover:bg-[#A01830] text-white"
          >
            插入
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ==================== Block Type Selector ====================

const blockTypeOptions: { value: BlockType; label: string }[] = [
  { value: 'paragraph', label: '段落' },
  { value: 'h1', label: '標題 1' },
  { value: 'h2', label: '標題 2' },
  { value: 'h3', label: '標題 3' },
]

function BlockTypeSelector({
  disabled,
  onSelect,
}: {
  disabled?: boolean
  onSelect: (type: BlockType) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-8 px-2 gap-1 text-[#525252] hover:text-[#0A0A0A] hover:bg-white min-w-[80px] justify-between"
        >
          <span className="text-xs">段落</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-36 p-1" align="start">
        {blockTypeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => {
              onSelect(option.value)
              setOpen(false)
            }}
            className="w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-[#FAFAFA] text-[#0A0A0A]"
          >
            {option.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

// ==================== WYSIWYG Toolbar ====================

function WysiwygToolbar() {
  const [loading, getInstance] = useInstance()

  const call = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (command: any, payload?: any) => {
      if (loading) return
      const editor = getInstance()
      editor?.action(callCommand(command, payload))
    },
    [loading, getInstance]
  )

  const handleBlockType = useCallback(
    (type: BlockType) => {
      if (loading) return
      const editor = getInstance()
      if (!editor) return
      switch (type) {
        case 'h1':
          editor.action(callCommand(wrapInHeadingCommand.key, 1))
          break
        case 'h2':
          editor.action(callCommand(wrapInHeadingCommand.key, 2))
          break
        case 'h3':
          editor.action(callCommand(wrapInHeadingCommand.key, 3))
          break
        case 'paragraph':
          // downgrade heading → paragraph: set heading level 0 or use turnIntoText
          editor.action(callCommand(wrapInHeadingCommand.key, 0))
          break
      }
    },
    [loading, getInstance]
  )

  const handleInsertTimestamp = useCallback(
    (seconds: number, display: string) => {
      if (loading) return
      const editor = getInstance()
      editor?.action(
        callCommand(insertTimestampCommand.key, { seconds, display })
      )
    },
    [loading, getInstance]
  )

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-2 bg-[#FAFAFA] rounded-xl border border-[#E5E5E5]">
      {/* Block type selector */}
      <BlockTypeSelector disabled={loading} onSelect={handleBlockType} />

      <Separator />

      {/* Inline formatting */}
      <ToolbarButton
        icon={Bold}
        label="粗體"
        disabled={loading}
        onClick={() => call(toggleStrongCommand.key)}
      />
      <ToolbarButton
        icon={Italic}
        label="斜體"
        disabled={loading}
        onClick={() => call(toggleEmphasisCommand.key)}
      />
      <ToolbarButton
        icon={Code}
        label="行內程式碼"
        disabled={loading}
        onClick={() => call(toggleInlineCodeCommand.key)}
      />
      <ToolbarButton
        icon={Link}
        label="連結"
        disabled={loading}
        onClick={() => call(toggleLinkCommand.key, { href: '' })}
      />

      <Separator />

      {/* Block actions */}
      <ToolbarButton
        icon={List}
        label="無序列表"
        disabled={loading}
        onClick={() => call(wrapInBulletListCommand.key)}
      />
      <ToolbarButton
        icon={ListOrdered}
        label="有序列表"
        disabled={loading}
        onClick={() => call(wrapInOrderedListCommand.key)}
      />
      <ToolbarButton
        icon={Quote}
        label="引用"
        disabled={loading}
        onClick={() => call(wrapInBlockquoteCommand.key)}
      />
      <ToolbarButton
        icon={Minus}
        label="分隔線"
        disabled={loading}
        onClick={() => call(insertHrCommand.key)}
      />

      <Separator />

      {/* Timestamp */}
      <TimestampPopover onInsert={handleInsertTimestamp} disabled={loading} />
    </div>
  )
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="h-8 w-8 p-0 text-[#525252] hover:text-[#0A0A0A] hover:bg-white"
      title={label}
    >
      <Icon className="h-4 w-4" />
    </Button>
  )
}

function Separator() {
  return <div className="w-px h-5 bg-[#E5E5E5] mx-1" />
}

// ==================== Milkdown WYSIWYG Core ====================

function MilkdownEditorCore({
  value,
  onChange,
}: {
  value: string
  onChange: (markdown: string) => void
}) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // 追蹤 editor 內部最後一次產出的 markdown，用來區分外部驅動 vs 用戶編輯
  const lastEditorMarkdownRef = useRef(value)

  const { get } = useEditor((root) => {
    return Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root)
        ctx.set(defaultValueCtx, value)
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown, prevMarkdown) => {
          if (markdown !== prevMarkdown) {
            lastEditorMarkdownRef.current = markdown
            onChangeRef.current(markdown)
          }
        })
      })
      .use(commonmark)
      .use(history)
      .use(listener)
      .use(remarkTimestampPlugin)
      .use(timestampNode)
      .use(timestampInputRule)
      .use(insertTimestampCommand)
  }, [])

  // 當外部 value 變化（例如切換 lesson、初始載入延遲）時，同步到 editor
  const [loading, getInstance] = useInstance()

  useEffect(() => {
    if (loading) return
    const editor = getInstance()
    if (!editor) return
    // 只有當外部 value 與 editor 內部的最後產出不同時才 replaceAll
    // 這避免了用戶打字 → onChange → value 更新 → replaceAll 的死循環
    if (value !== lastEditorMarkdownRef.current) {
      lastEditorMarkdownRef.current = value
      editor.action(replaceAll(value))
    }
  }, [value, loading, getInstance])

  return <Milkdown />
}

// ==================== Raw Markdown Toolbar ====================

function RawMarkdownToolbar({
  onInsertTimestamp,
}: {
  onInsertTimestamp: (seconds: number, display: string) => void
}) {
  return (
    <div className="flex items-center gap-0.5 p-2 bg-[#FAFAFA] rounded-xl border border-[#E5E5E5]">
      <TimestampPopover onInsert={onInsertTimestamp} />
    </div>
  )
}

// ==================== Main Component ====================

export function MilkdownMarkdownEditor({
  value,
  onChange,
  placeholder = '輸入內容...',
  editorKey: externalKey,
}: MilkdownEditorProps) {
  const [mode, setMode] = useState<EditorMode>('wysiwyg')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // 用 ref 追蹤最新的 value，避免 Milkdown onChange 回寫時觸發不必要的重掛載
  const latestValueRef = useRef(value)
  latestValueRef.current = value

  // WYSIWYG mode onChange
  const handleWysiwygChange = useCallback(
    (markdown: string) => {
      latestValueRef.current = markdown
      onChange(markdown)
    },
    [onChange]
  )

  // Raw markdown mode onChange
  const handleRawChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      latestValueRef.current = newValue
      onChange(newValue)
    },
    [onChange]
  )

  // Raw mode: insert timestamp at cursor
  const handleRawInsertTimestamp = useCallback(
    (seconds: number, display: string) => {
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = `[${display}](#t=${seconds})`
      const currentValue = latestValueRef.current
      const newValue =
        currentValue.substring(0, start) + text + currentValue.substring(end)

      latestValueRef.current = newValue
      onChange(newValue)

      // Restore focus & cursor
      setTimeout(() => {
        textarea.focus()
        const newPos = start + text.length
        textarea.setSelectionRange(newPos, newPos)
      }, 0)
    },
    [onChange]
  )

  // 切換模式時或外部 key 改變時，重新掛載 Milkdown
  const [internalKey, setInternalKey] = useState(0)

  const handleModeSwitch = useCallback(
    (newMode: EditorMode) => {
      if (newMode === mode) return
      setMode(newMode)
      if (newMode === 'wysiwyg') {
        setInternalKey((k) => k + 1)
      }
    },
    [mode]
  )

  // 組合 key：外部 editorKey 變化（切換 lesson）或內部 key 變化（切換模式）
  const combinedKey = `${externalKey ?? ''}__${internalKey}`

  return (
    <div className="space-y-3">
      {/* Mode Switch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center bg-[#F5F5F5] rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => handleModeSwitch('wysiwyg')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === 'wysiwyg'
                ? 'bg-white text-[#0A0A0A] shadow-sm'
                : 'text-[#525252] hover:text-[#0A0A0A]'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            編輯
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('markdown')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === 'markdown'
                ? 'bg-white text-[#0A0A0A] shadow-sm'
                : 'text-[#525252] hover:text-[#0A0A0A]'
            }`}
          >
            <FileCode2 className="h-3.5 w-3.5" />
            Markdown
          </button>
        </div>
      </div>

      {/* WYSIWYG Mode */}
      {mode === 'wysiwyg' && (
        <MilkdownProvider key={combinedKey}>
          <WysiwygToolbar />
          <div className="milkdown-editor-wrapper min-h-[400px] p-4 bg-white border border-[#E5E5E5] rounded-xl overflow-auto prose prose-sm max-w-none prose-headings:text-[#0A0A0A] prose-p:text-[#525252] prose-a:text-[#C41E3A] prose-strong:text-[#0A0A0A] prose-code:text-[#C41E3A] prose-code:bg-[#FAFAFA] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-[#FAFAFA] prose-blockquote:border-[#E5E5E5] prose-blockquote:text-[#525252] prose-li:text-[#525252]">
            <MilkdownEditorCore
              value={value}
              onChange={handleWysiwygChange}
            />
          </div>
        </MilkdownProvider>
      )}

      {/* Raw Markdown Mode */}
      {mode === 'markdown' && (
        <>
          <RawMarkdownToolbar onInsertTimestamp={handleRawInsertTimestamp} />
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleRawChange}
            placeholder={placeholder}
            className="min-h-[400px] bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] font-mono text-sm resize-none rounded-xl"
          />
        </>
      )}
    </div>
  )
}
