-- FIX RLS POLICIES FOR STOCK BATCHES
-- Run this in Supabase SQL Editor to fix the RLS policy issue

-- ============================================
-- Drop existing policies
-- ============================================
DROP POLICY IF EXISTS "Allow authenticated users to read stock_batches" ON stock_batches;
DROP POLICY IF EXISTS "Allow authenticated users to insert stock_batches" ON stock_batches;
DROP POLICY IF EXISTS "Allow authenticated users to update stock_batches" ON stock_batches;
DROP POLICY IF EXISTS "Allow authenticated users to delete stock_batches" ON stock_batches;

DROP POLICY IF EXISTS "Allow authenticated users to read stock_batch_usage" ON stock_batch_usage;
DROP POLICY IF EXISTS "Allow authenticated users to insert stock_batch_usage" ON stock_batch_usage;
DROP POLICY IF EXISTS "Allow authenticated users to update stock_batch_usage" ON stock_batch_usage;
DROP POLICY IF EXISTS "Allow authenticated users to delete stock_batch_usage" ON stock_batch_usage;

-- ============================================
-- Create new permissive policies (allow ALL for authenticated users)
-- ============================================

-- Stock Batches Policies
CREATE POLICY "Enable all operations for authenticated users on stock_batches"
  ON stock_batches
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Stock Batch Usage Policies
CREATE POLICY "Enable all operations for authenticated users on stock_batch_usage"
  ON stock_batch_usage
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Verify policies
-- ============================================
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('stock_batches', 'stock_batch_usage')
ORDER BY tablename, policyname;

-- Expected: Should show policies with roles = {authenticated}, cmd = ALL
