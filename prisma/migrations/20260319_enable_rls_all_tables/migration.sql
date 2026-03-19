-- Enable Row Level Security on ALL public tables
--
-- Context: Supabase Security Advisor flagged 23 errors:
--   - 20x "RLS Disabled in Public"
--   - 3x "Sensitive Columns Exposed" (User.password, Account.access_token/refresh_token, VerificationToken.token)
--
-- Strategy: This app uses Prisma with direct PostgreSQL connection (postgres role),
-- which bypasses RLS automatically. We enable RLS with NO policies for anon/authenticated,
-- effectively blocking all PostgREST (Supabase API) access to these tables.
-- This is the correct approach since the app never queries these tables via PostgREST.

-- ==================== Auth / User System ====================

ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."VerificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."GuestActivationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PasswordResetToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."LoginAttempt" ENABLE ROW LEVEL SECURITY;

-- ==================== Course System ====================

ALTER TABLE "public"."Course" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Chapter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Lesson" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."LessonProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."LessonComment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."WatchTimeLog" ENABLE ROW LEVEL SECURITY;

-- ==================== Payment / Order System ====================

ALTER TABLE "public"."Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Purchase" ENABLE ROW LEVEL SECURITY;

-- ==================== Email System ====================

ALTER TABLE "public"."EmailDeliveryLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CourseWelcomeEmail" ENABLE ROW LEVEL SECURITY;

-- ==================== Media / Settings / Admin ====================

ALTER TABLE "public"."Media" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SiteSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AdminLog" ENABLE ROW LEVEL SECURITY;

-- ==================== Verify ====================
-- After running this migration, check that:
-- 1. All 20 tables show RLS = enabled in Supabase Dashboard > Database > Tables
-- 2. The app (Prisma) still works normally (postgres role bypasses RLS)
-- 3. Supabase Security Advisor shows 0 errors
-- 4. Direct PostgREST queries with anon key return empty results (expected)
