-- Quick verification queries
-- Copy and run these one by one in Supabase SQL Editor

-- 1. Check if stock_batches table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'stock_batches'
) as stock_batches_exists;

-- 2. Check if stock_batch_usage table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'stock_batch_usage'
) as stock_batch_usage_exists;

-- 3. Check if transaction_items has new columns
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'transaction_items'
  AND column_name IN ('cost_of_goods', 'profit');

-- 4. Check if function exists
SELECT EXISTS (
  SELECT FROM pg_proc 
  WHERE proname = 'decrement_batch_quantity'
) as function_exists;

-- 5. Check RLS policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'stock_batches';

-- Expected results:
-- Query 1: stock_batches_exists = true
-- Query 2: stock_batch_usage_exists = true
-- Query 3: Should return 2 rows (cost_of_goods and profit)
-- Query 4: function_exists = true
-- Query 5: Should show INSERT, SELECT, UPDATE policies
