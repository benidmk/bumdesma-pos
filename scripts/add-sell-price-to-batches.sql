-- Add sell_price column to stock_batches for Hybrid pricing
-- Run this in Supabase SQL Editor

ALTER TABLE stock_batches
ADD COLUMN IF NOT EXISTS sell_price DECIMAL(15,2) DEFAULT NULL;

COMMENT ON COLUMN stock_batches.sell_price IS 'Optional sell price override for this batch. If NULL, use products.sell_price';

-- Verify column added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'stock_batches'
  AND column_name = 'sell_price';

-- Expected: sell_price | numeric | YES
