// components/admin/comments/milkdown-simple-editor.tsx
// 精簡版 Milkdown WYSIWYG 編輯器（無時間戳，適用於回覆/歡迎信）

'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/kit/core'
import {
  commonmark,
  toggleStrongCommand,
  toggleEmphasisCommand,
  wrapInHeadingCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand,
  toggleInlineCodeCommand,
  insertHrCommand,
  toggleLinkCommand,
} from '@milkdown/kit/preset/commonmark'
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
  Eye,
  FileCode2,
  ChevronDown,
} from 'lucide-react'

// ==================== Types ====================

interface MilkdownSimpleEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  editorKey?: string
  minHeight?: string
}

type BlockType = 'paragraph' | 'h1' | 'h2' | 'h3'
type EditorMode = 'wysiwyg' | 'markdown'

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

// ==================== Toolbar ====================

function SimpleToolbar() {
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
          editor.action(callCommand(wrapInHeadingCommand.key, 0))
          break
      }
    },
    [loading, getInstance]
  )

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-2 bg-[#FAFAFA] rounded-xl border border-[#E5E5E5]">
      <BlockTypeSelector disabled={loading} onSelect={handleBlockType} />
      <ToolbarSeparator />
      <ToolbarButton icon={Bold} label="粗體" disabled={loading} onClick={() => call(toggleStrongCommand.key)} />
      <ToolbarButton icon={Italic} label="斜體" disabled={loading} onClick={() => call(toggleEmphasisCommand.key)} />
      <ToolbarButton icon={Code} label="行內程式碼" disabled={loading} onClick={() => call(toggleInlineCodeCommand.key)} />
      <ToolbarButton icon={Link} label="連結" disabled={loading} onClick={() => call(toggleLinkCommand.key, { href: '' })} />
      <ToolbarSeparator />
      <ToolbarButton icon={List} label="無序列表" disabled={loading} onClick={() => call(wrapInBulletListCommand.key)} />
      <ToolbarButton icon={ListOrdered} label="有序列表" disabled={loading} onClick={() => call(wrapInOrderedListCommand.key)} />
      <ToolbarButton icon={Quote} label="引用" disabled={loading} onClick={() => call(wrapInBlockquoteCommand.key)} />
      <ToolbarButton icon={Minus} label="分隔線" disabled={loading} onClick={() => call(insertHrCommand.key)} />
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

function ToolbarSeparator() {
  return <div className="w-px h-5 bg-[#E5E5E5] mx-1" />
}

// ==================== Milkdown Core ====================

function MilkdownCore({
  value,
  onChange,
}: {
  value: string
  onChange: (markdown: string) => void
}) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const lastEditorMarkdownRef = useRef(value)

  useEditor((root) => {
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
  }, [])

  const [loading, getInstance] = useInstance()

  useEffect(() => {
    if (loading) return
    const editor = getInstance()
    if (!editor) return
    if (value !== lastEditorMarkdownRef.current) {
      lastEditorMarkdownRef.current = value
      editor.action(replaceAll(value))
    }
  }, [value, loading, getInstance])

  return <Milkdown />
}

// ==================== Main Component ====================

export function MilkdownSimpleEditor({
  value,
  onChange,
  placeholder = '輸入內容...',
  editorKey: externalKey,
  minHeight = '200px',
}: MilkdownSimpleEditorProps) {
  const [mode, setMode] = useState<EditorMode>('wysiwyg')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const latestValueRef = useRef(value)
  latestValueRef.current = value

  const handleWysiwygChange = useCallback(
    (markdown: string) => {
      latestValueRef.current = markdown
      onChange(markdown)
    },
    [onChange]
  )

  const handleRawChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      latestValueRef.current = newValue
      onChange(newValue)
    },
    [onChange]
  )

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

  const combinedKey = `${externalKey ?? ''}__${internalKey}`

  return (
    <div className="space-y-2">
      {/* Mode Switch */}
      <div className="flex items-center">
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
          <SimpleToolbar />
          <div
            className="milkdown-editor-wrapper p-4 bg-white border border-[#E5E5E5] rounded-xl overflow-auto prose prose-sm max-w-none prose-headings:text-[#0A0A0A] prose-p:text-[#525252] prose-a:text-[#F5A524] prose-strong:text-[#0A0A0A] prose-code:text-[#F5A524] prose-code:bg-[#FAFAFA] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-[#FAFAFA] prose-blockquote:border-[#E5E5E5] prose-blockquote:text-[#525252] prose-li:text-[#525252]"
            style={{ minHeight }}
          >
            <MilkdownCore value={value} onChange={handleWysiwygChange} />
          </div>
        </MilkdownProvider>
      )}

      {/* Raw Markdown Mode */}
      {mode === 'markdown' && (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleRawChange}
          placeholder={placeholder}
          className="bg-white border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#A3A3A3] font-mono text-sm resize-none rounded-xl"
          style={{ minHeight }}
        />
      )}
    </div>
  )
}
