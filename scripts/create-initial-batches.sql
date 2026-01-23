-- Migration: Create initial batches for existing products with stock
-- Run this ONCE in Supabase SQL Editor

-- Create batch 1 for all products that have stock but no batches yet
INSERT INTO stock_batches (
  product_id,
  stock_entry_id,
  purchase_price,
  sell_price,
  quantity_initial,
  quantity_remaining,
  batch_date,
  created_at
)
SELECT 
  p.id as product_id,
  NULL as stock_entry_id, -- No stock entry for initial stock
  p.buy_price as purchase_price,
  p.sell_price as sell_price,
  p.stock as quantity_initial,
  p.stock as quantity_remaining,
  p.created_at as batch_date,
  NOW() as created_at
FROM products p
WHERE p.stock > 0
  AND NOT EXISTS (
    SELECT 1 FROM stock_batches sb 
    WHERE sb.product_id = p.id
  );

-- Verify: Check created batches
SELECT 
  p.name as product_name,
  p.stock as current_stock,
  sb.quantity_initial,
  sb.quantity_remaining,
  sb.purchase_price,
  sb.sell_price,
  sb.batch_date
FROM stock_batches sb
JOIN products p ON p.id = sb.product_id
WHERE sb.stock_entry_id IS NULL
ORDER BY p.name;

-- Expected: Should see all products with stock > 0 now have batches
