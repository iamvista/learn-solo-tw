# Prompt 模板：SEO 與內容

## 1. SEO Meta Tags Prompt

```
請為我的網站每個頁面生成 SEO meta tags。

網站類型：[個人品牌 / 產品銷售 / 服務介紹]
品牌名稱：[名稱]
主要關鍵字：[列出 3-5 個]

頁面清單：
1. 首頁 — [頁面主題]
2. [頁面名稱] — [頁面主題]
3. [頁面名稱] — [頁面主題]

請為每個頁面提供：
- title（60 字元以內，含品牌名）
- meta description（155 字元以內，含行動呼籲）
- Open Graph title 和 description
- 建議的 H1 標題

語言：繁體中文
```

## 2. JSON-LD 結構化資料 Prompt

```
請幫我的網站生成 JSON-LD 結構化資料。

網站類型：[個人品牌網站]
網站 URL：[URL]

需要的 Schema：
1. Organization / Person（首頁）
2. WebSite（首頁）
3. Service（服務頁）
4. FAQPage（如果有 FAQ）
5. BreadcrumbList（所有頁面）

請生成可以直接貼入 HTML <head> 的 <script type="application/ld+json"> 標籤。
```

## 3. 部落格文章 SEO Prompt

```
我想寫一篇關於 [主題] 的部落格文章。

目標關鍵字：[主關鍵字]
次要關鍵字：[列出 2-3 個]
目標讀者：[描述]

請幫我：
1. 建議一個 SEO 友善的標題（含關鍵字，吸引點擊）
2. 寫出文章大綱（H2 和 H3 標題結構）
3. 每個段落的重點提示
4. meta description
5. 建議的內部連結和外部連結策略

文章長度：約 [1500-2000] 字
語調：[專業但易讀 / 輕鬆口語]
語言：繁體中文
```

## 4. Google Analytics 安裝 Prompt

```
請幫我在網站中安裝 Google Analytics 4。

我的 GA4 Measurement ID 是：G-XXXXXXXXXX

需要追蹤的事件：
1. 頁面瀏覽（預設）
2. CTA 按鈕點擊
3. 表單送出
4. 外部連結點擊
5. 頁面滾動深度（25%, 50%, 75%, 100%）

請提供：
1. 要放在 <head> 中的基本追蹤碼
2. 各個自訂事件的 JavaScript 程式碼
3. 安裝後的驗證方法
```

## 5. 網站速度優化 Prompt

```
我的網站 PageSpeed 分數是 [分數]，需要優化。

目前的問題（從 PageSpeed Insights 複製）：
1. [問題描述]
2. [問題描述]
3. [問題描述]

我的技術棧：HTML + CSS + JavaScript（無框架）
圖片數量：約 [N] 張

請針對每個問題提供：
1. 問題原因的簡單解釋
2. 具體的修正步驟
3. 修正後的程式碼

優先處理對分數影響最大的問題。
```
