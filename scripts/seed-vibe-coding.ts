// scripts/seed-vibe-coding.ts
// 建立 Vibe Coding 課程的基本資料結構
// 執行：npx tsx scripts/seed-vibe-coding.ts

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🚀 開始建立 Vibe Coding 課程...')

  // 建立課程
  const course = await prisma.course.upsert({
    where: { slug: 'vibe-coding' },
    update: {},
    create: {
      title: 'Vibe Coding 實戰課程',
      subtitle: '不寫程式也能打造你的數位產品',
      slug: 'vibe-coding',
      description:
        '學會用自然語言和 AI 協作，從想法到上線只需要一個下午。這門課專為零程式基礎的創業者、自由工作者、行銷人設計，帶你掌握 AI 時代最重要的新技能。',
      price: 3980,
      salePrice: 2980,
      saleLabel: '早鳥優惠',
      showCountdown: false,
      status: 'DRAFT', // 先設為草稿，上架前改為 PUBLISHED
      landingPageSlug: 'vibe-coding',

      // SEO
      seoTitle: 'Vibe Coding 實戰課程 — 不寫程式也能打造數位產品 | 自由人學院',
      seoDesc:
        '零基礎也能學會用 AI 打造網站、工具、Landing Page。由 Vista 親授，從想法到上線的完整實戰課程。',
      seoKeywords: 'Vibe Coding, AI 寫程式, 不寫程式, 數位產品, 線上課程, AI 工具, Cursor, Claude',

      // OG
      ogDescription: '用自然語言和 AI 協作，從零打造你的數位產品。零基礎也能上手！',

      // JSON-LD
      instructorName: 'Vista',
      instructorTitle: '全端工程師 / AI 實踐者 / 自由人學院創辦人',
      instructorDesc:
        'Vista 是全端工程師與 AI 實踐者，獨立開發多個線上平臺，經營 2,400+ 人的 Vibe Coding 臺灣社群，已帶領上百位零基礎學員完成第一個數位作品。',
      courseWorkload: 'PT5H',

      // 購買通知
      notifyAdminOnPurchase: true,
    },
  })

  console.log(`✅ 課程已建立: ${course.title} (${course.id})`)

  // 建立章節與單元結構
  const chapters = [
    {
      title: '第一章：歡迎來到 Vibe Coding 的世界',
      order: 0,
      lessons: [
        { title: '什麼是 Vibe Coding？為什麼你該學', order: 0, isFree: true },
        { title: 'AI 時代的五大核心能力', order: 1, isFree: true },
        { title: '課程導覽與學習建議', order: 2, isFree: false },
      ],
    },
    {
      title: '第二章：工具設定與環境準備',
      order: 1,
      lessons: [
        { title: '認識你的 AI 夥伴：Claude、ChatGPT、Cursor', order: 0, isFree: false },
        { title: 'Cursor 安裝與基本操作', order: 1, isFree: false },
        { title: '第一次和 AI 對話就上手', order: 2, isFree: false },
      ],
    },
    {
      title: '第三章：Prompt 工程實戰',
      order: 2,
      lessons: [
        { title: 'Prompt 的基本結構與原則', order: 0, isFree: false },
        { title: '如何描述需求讓 AI 聽懂', order: 1, isFree: false },
        { title: '除錯與迭代：當 AI 搞錯的時候', order: 2, isFree: false },
        { title: '進階 Prompt 技巧：角色設定與分步指令', order: 3, isFree: false },
      ],
    },
    {
      title: '第四章：從零打造你的第一個網站',
      order: 3,
      lessons: [
        { title: '企劃：把你的想法變成具體規格', order: 0, isFree: false },
        { title: '設計：用 AI 生成頁面佈局', order: 1, isFree: false },
        { title: '開發：一步步打造完整網站', order: 2, isFree: false },
        { title: '部署上線：讓全世界看到你的作品', order: 3, isFree: false },
      ],
    },
    {
      title: '第五章：進階實戰專案',
      order: 4,
      lessons: [
        { title: '打造互動工具：計算機 / 診斷測驗', order: 0, isFree: false },
        { title: '建立名單蒐集頁 (Landing Page)', order: 1, isFree: false },
        { title: '串接外部服務：表單、Email、資料庫', order: 2, isFree: false },
      ],
    },
    {
      title: '第六章：商業變現與持續成長',
      order: 5,
      lessons: [
        { title: '你的作品如何變成收入？', order: 0, isFree: false },
        { title: 'SEO 基礎：讓 Google 找到你', order: 1, isFree: false },
        { title: '持續學習的路線圖', order: 2, isFree: false },
        { title: '結語：從使用者進化為創造者', order: 3, isFree: false },
      ],
    },
  ]

  for (const ch of chapters) {
    const chapter = await prisma.chapter.create({
      data: {
        courseId: course.id,
        title: ch.title,
        order: ch.order,
      },
    })

    for (const ls of ch.lessons) {
      await prisma.lesson.create({
        data: {
          chapterId: chapter.id,
          title: ls.title,
          order: ls.order,
          isFree: ls.isFree,
          status: 'COMING_SOON',
          comingSoonDescription: '課程製作中，敬請期待！',
        },
      })
    }

    console.log(`  📚 ${ch.title} (${ch.lessons.length} 個單元)`)
  }

  const totalLessons = chapters.reduce((sum, ch) => sum + ch.lessons.length, 0)
  console.log(`\n🎉 完成！共 ${chapters.length} 個章節、${totalLessons} 個單元`)
  console.log(`\n下一步：`)
  console.log(`  1. 到後臺 /admin/courses/${course.id}/info 確認課程資訊`)
  console.log(`  2. 到後臺 /admin/courses/${course.id}/curriculum 編輯章節內容`)
  console.log(`  3. 上傳影片到媒體中心 /admin/media`)
  console.log(`  4. 準備好後將狀態改為 PUBLISHED`)
}

main()
  .catch((e) => {
    console.error('❌ 錯誤:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
