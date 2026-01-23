-- QUICK FIX: Disable RLS for Development
-- This is the FASTEST way to fix the issue
-- Run this in Supabase SQL Editor NOW

-- ============================================
-- Option 1: DISABLE RLS (Recommended for Development)
-- ============================================
ALTER TABLE stock_batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_batch_usage DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('stock_batches', 'stock_batch_usage');

-- Expected: rowsecurity = false for both tables

-- ============================================
-- DONE! Test your app now
-- ============================================

-- If you want to RE-ENABLE RLS later (for production), run this:
-- ALTER TABLE stock_batches ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE stock_batch_usage ENABLE ROW LEVEL SECURITY;
-- Then create proper policies using fix-rls-policies.sql
