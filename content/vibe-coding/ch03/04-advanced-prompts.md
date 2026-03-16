# 3-4 進階 Prompt 技巧：角色設定與分步指令

## 學習目標

- 掌握進階 Prompt 模式
- 學會用 System Prompt 與 Project Rules
- 能處理複雜的多步驟任務

## 內容大綱

### 1. 角色設定的威力（5 分鐘）
- 基礎角色：「你是一位前端工程師」
- 進階角色：帶經驗和偏好的角色
  - 「你是一位有 10 年經驗的前端工程師，偏好使用 Tailwind CSS，程式碼風格簡潔，注重效能」
- 角色 + 限制：「你只使用 HTML/CSS/JS，不使用任何框架」
- 什麼時候角色設定最有效？

### 2. System Prompt 與 Project Rules（7 分鐘）
- 什麼是 System Prompt？（對話開始前的預設指令）
- Cursor 的 `.cursorrules` 檔案
- 實作：為你的專案寫一份 Rules
  - 技術棧偏好
  - 程式碼風格
  - 命名慣例
  - 檔案結構
- 範例 `.cursorrules` 檔案（課程提供下載）

### 3. 分步指令（Chain of Thought）（7 分鐘）
- 為什麼一次一步比一次到位好？
- 方法一：手動分步
  - 「Step 1: 先建立 HTML 結構」
  - 「Step 2: 加上 CSS 樣式」
  - 「Step 3: 加上互動功能」
- 方法二：讓 AI 自己分步
  - 「請先列出你的計畫步驟，確認後再開始執行」
- 方法三：Cursor Agent Mode（自動分步）

### 4. 進階技巧合集（8 分鐘）

#### Few-shot Learning
- 給 AI 看 1-3 個範例，讓它照著做
- 適合：固定格式的輸出（元件、頁面、資料結構）

#### 否定指令
- 「不要使用 jQuery」「不要加入任何動畫」
- 什麼時候用否定比肯定更有效

#### 參考程式碼
- 在 Cursor 中用 @file 引用現有檔案
- 「參考 @header.tsx 的風格，幫我建立 footer.tsx」

#### 思考鏈（Think Step by Step）
- 「在回答之前，先分析這個問題的所有可能原因」
- 適合：除錯、決策、架構規劃

### 5. 建立你的 Prompt 武器庫（3 分鐘）
- 把好用的 Prompt 存起來
- 建議用 Notion / Obsidian 管理
- 課程提供的 Prompt 模板包介紹

## 課後練習

- [ ] 為你的專案寫一份 `.cursorrules` 檔案
- [ ] 用 Few-shot Learning 讓 AI 生成 3 個風格一致的元件
- [ ] 用分步指令完成一個包含 3 個頁面的小網站
