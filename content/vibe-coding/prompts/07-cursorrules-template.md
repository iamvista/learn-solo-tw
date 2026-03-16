# .cursorrules 模板

## 基礎版（適合初學者）

將以下內容存為專案根目錄的 `.cursorrules` 檔案：

```
# Project Rules

## 基本資訊
- 這是一個 [專案類型] 專案
- 使用 HTML + Tailwind CSS (CDN) + 原生 JavaScript
- 語言：繁體中文

## 程式碼風格
- 使用 2 空格縮排
- HTML class 使用 Tailwind utility classes
- JavaScript 使用 const/let，不使用 var
- 函式使用箭頭函式 (arrow function)

## 設計規範
- 主色：[色碼]
- 輔色：[色碼]
- 背景色：[色碼]
- 字體：系統預設字體 (system-ui)
- 圓角：8px (rounded-lg)
- 陰影：shadow-md

## 響應式設計
- 手機版優先 (mobile-first)
- 斷點：sm(640px), md(768px), lg(1024px)

## 注意事項
- 所有文字內容使用繁體中文
- 圖片使用 lazy loading
- 表單要有前端驗證
- 不使用 jQuery 或其他 JavaScript 框架
```

## 進階版（有框架經驗後使用）

```
# Project Rules

## 技術棧
- Framework: Next.js 14 (App Router)
- Styling: Tailwind CSS
- Language: TypeScript
- Package Manager: pnpm

## 程式碼風格
- 使用 TypeScript strict mode
- 元件使用 function component + arrow function
- 優先使用 Server Components
- Client Components 加上 'use client' 指令
- 匯入排序：React → 外部套件 → 內部模組 → 樣式

## 命名慣例
- 元件：PascalCase (e.g., HeroSection)
- 檔案：kebab-case (e.g., hero-section.tsx)
- 變數/函式：camelCase
- 常數：UPPER_SNAKE_CASE
- CSS class：使用 Tailwind utilities，避免自訂 class

## 設計規範
- 使用 CSS variables for colors (defined in globals.css)
- 間距使用 Tailwind 的 spacing scale
- 所有互動元素要有 hover/focus 狀態
- 動畫使用 framer-motion

## 注意事項
- 繁體中文介面
- 所有使用者輸入必須做驗證（Zod）
- API 回應使用統一的錯誤處理格式
- 敏感資訊不能出現在前端程式碼中
```

## 使用方式

1. 在 Cursor 中開啟你的專案資料夾
2. 在根目錄建立 `.cursorrules` 檔案
3. 貼上上方模板，修改 `[佔位符]` 為你的專案資訊
4. 存檔後，Cursor 會自動在每次 AI 對話中套用這些規則
