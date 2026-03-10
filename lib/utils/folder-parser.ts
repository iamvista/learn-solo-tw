// lib/utils/folder-parser.ts
// 資料夾結構解析工具

export interface ParsedFolderName {
  chapterIndex: number
  lessonIndex: number
}

/**
 * 解析資料夾命名格式
 *
 * 支援格式:
 * - "N" (純數字): 視為第 N 章第 1 單元 (e.g., "2" → Chapter 2, Lesson 1)
 * - "N-M" (章節-單元): 視為第 N 章第 M 單元 (e.g., "1-3" → Chapter 1, Lesson 3)
 * - "N-0" (章節-0): 視為第 N 章第 1 單元 (e.g., "1-0" → Chapter 1, Lesson 1)
 *
 * @param name 資料夾名稱
 * @returns 解析結果，無效格式返回 null
 */
export function parseFolderName(name: string): ParsedFolderName | null {
  const trimmed = name.trim()

  // "N-M" 格式 (e.g., "1-1", "2-3", "10-12", "1-0")
  const lessonMatch = trimmed.match(/^(\d+)-(\d+)$/)
  if (lessonMatch) {
    const chapterIndex = parseInt(lessonMatch[1], 10)
    const lessonIndex = parseInt(lessonMatch[2], 10)
    return {
      chapterIndex,
      // 如果 lessonIndex 是 0，視為第 1 單元
      lessonIndex: lessonIndex === 0 ? 1 : lessonIndex,
    }
  }

  // "N" 格式 (純數字，視為 N-1)
  const chapterMatch = trimmed.match(/^(\d+)$/)
  if (chapterMatch) {
    return {
      chapterIndex: parseInt(chapterMatch[1], 10),
      lessonIndex: 1,
    }
  }

  return null
}

export interface ParsedFolderItem {
  id: string
  folderName: string
  chapterIndex: number
  lessonIndex: number
  videoFile: File | null
  srtFile: File | null
  hasVideo: boolean
  hasSrt: boolean
}

export interface ParsedChapter {
  chapterIndex: number
  title: string
  lessons: ParsedLesson[]
}

export interface ParsedLesson {
  id: string
  lessonIndex: number
  title: string
  folderItem: ParsedFolderItem
}

/**
 * 從 FileList 解析課程結構
 *
 * @param files 透過 webkitdirectory 或拖放取得的檔案列表
 * @returns 解析後的章節結構
 */
export function parseFileList(files: FileList | File[]): ParsedChapter[] {
  const folderItems = new Map<string, ParsedFolderItem>()
  const fileArray = Array.from(files)

  for (const file of fileArray) {
    // 取得相對路徑
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
    const pathParts = relativePath.split('/')

    // 需要至少 2 層路徑 (根目錄/子資料夾/檔案)
    if (pathParts.length < 2) continue

    // 取得子資料夾名稱 (第二層)
    const folderName = pathParts.length >= 3 ? pathParts[1] : pathParts[0]
    const fileName = pathParts[pathParts.length - 1].toLowerCase()

    // 解析資料夾名稱
    const parsed = parseFolderName(folderName)
    if (!parsed) continue

    // 取得或建立資料夾項目
    let item = folderItems.get(folderName)
    if (!item) {
      item = {
        id: `${folderName}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        folderName,
        chapterIndex: parsed.chapterIndex,
        lessonIndex: parsed.lessonIndex,
        videoFile: null,
        srtFile: null,
        hasVideo: false,
        hasSrt: false,
      }
      folderItems.set(folderName, item)
    }

    // 判斷檔案類型 (檔名需與資料夾名稱匹配)
    const baseFileName = fileName.replace(/\.[^.]+$/, '') // 移除副檔名
    const expectedBaseName = folderName.toLowerCase()

    if (baseFileName === expectedBaseName) {
      if (fileName.endsWith('.mp4') || fileName.endsWith('.mov') || fileName.endsWith('.mkv') || fileName.endsWith('.webm')) {
        item.videoFile = file
        item.hasVideo = true
      } else if (fileName.endsWith('.srt')) {
        item.srtFile = file
        item.hasSrt = true
      }
    }
  }

  // 轉換為章節結構
  return buildChapterStructure(Array.from(folderItems.values()))
}

/**
 * 從解析後的資料夾項目建立章節結構
 */
function buildChapterStructure(items: ParsedFolderItem[]): ParsedChapter[] {
  // 按章節和單元排序
  const sorted = items.sort((a, b) => {
    if (a.chapterIndex !== b.chapterIndex) {
      return a.chapterIndex - b.chapterIndex
    }
    return a.lessonIndex - b.lessonIndex
  })

  // 依章節分組
  const chapters = new Map<number, ParsedChapter>()

  for (const item of sorted) {
    let chapter = chapters.get(item.chapterIndex)
    if (!chapter) {
      chapter = {
        chapterIndex: item.chapterIndex,
        title: `第 ${item.chapterIndex} 章`,
        lessons: [],
      }
      chapters.set(item.chapterIndex, chapter)
    }

    // 建立單元
    chapter.lessons.push({
      id: item.id,
      lessonIndex: item.lessonIndex,
      title: `${item.folderName}`,
      folderItem: item,
    })
  }

  // 轉換為陣列並排序
  return Array.from(chapters.values()).sort((a, b) => a.chapterIndex - b.chapterIndex)
}

/**
 * 驗證解析結果
 *
 * @returns 缺失檔案的警告訊息列表
 */
export function validateParsedChapters(chapters: ParsedChapter[]): string[] {
  const warnings: string[] = []

  for (const chapter of chapters) {
    for (const lesson of chapter.lessons) {
      const { folderItem } = lesson

      if (!folderItem.hasVideo) {
        warnings.push(`「${folderItem.folderName}」缺少影片檔案 (${folderItem.folderName}.mp4)`)
      }

      if (!folderItem.hasSrt) {
        warnings.push(`「${folderItem.folderName}」缺少字幕檔案 (${folderItem.folderName}.srt)`)
      }
    }
  }

  return warnings
}

/**
 * 計算統計資訊
 */
export function getParseStats(chapters: ParsedChapter[]) {
  const totalChapters = chapters.length
  const totalLessons = chapters.reduce((acc, ch) => acc + ch.lessons.length, 0)
  const lessonsWithVideo = chapters.reduce(
    (acc, ch) => acc + ch.lessons.filter(l => l.folderItem.hasVideo).length,
    0
  )
  const lessonsWithSrt = chapters.reduce(
    (acc, ch) => acc + ch.lessons.filter(l => l.folderItem.hasSrt).length,
    0
  )

  return {
    totalChapters,
    totalLessons,
    lessonsWithVideo,
    lessonsWithSrt,
    completeCount: chapters.reduce(
      (acc, ch) => acc + ch.lessons.filter(l => l.folderItem.hasVideo && l.folderItem.hasSrt).length,
      0
    ),
  }
}
