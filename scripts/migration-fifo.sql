-- FIFO Stock Management - Database Migration
-- Run this script in Supabase SQL Editor

-- ============================================
-- 1. Create stock_batches table
-- ============================================
CREATE TABLE IF NOT EXISTS stock_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  stock_entry_id UUID REFERENCES stock_entries(id) ON DELETE SET NULL,
  purchase_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  quantity_initial INTEGER NOT NULL CHECK (quantity_initial > 0),
  quantity_remaining INTEGER NOT NULL CHECK (quantity_remaining >= 0),
  batch_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_remaining CHECK (quantity_remaining <= quantity_initial)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_batches_product_date 
  ON stock_batches(product_id, batch_date);
  
CREATE INDEX IF NOT EXISTS idx_batches_product_remaining 
  ON stock_batches(product_id, quantity_remaining);

COMMENT ON TABLE stock_batches IS 'Tracks each stock batch with specific purchase price for FIFO calculation';
COMMENT ON COLUMN stock_batches.quantity_initial IS 'Initial quantity when batch was created';
COMMENT ON COLUMN stock_batches.quantity_remaining IS 'Remaining unsold quantity';
COMMENT ON COLUMN stock_batches.batch_date IS 'Date when batch entered, used for FIFO ordering';

-- ============================================
-- 2. Create stock_batch_usage table
-- ============================================
CREATE TABLE IF NOT EXISTS stock_batch_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_item_id UUID NOT NULL REFERENCES transaction_items(id) ON DELETE CASCADE,
  stock_batch_id UUID NOT NULL REFERENCES stock_batches(id) ON DELETE RESTRICT,
  quantity_used INTEGER NOT NULL CHECK (quantity_used > 0),
  unit_cost DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_transaction_item 
  ON stock_batch_usage(transaction_item_id);
  
CREATE INDEX IF NOT EXISTS idx_usage_batch 
  ON stock_batch_usage(stock_batch_id);

COMMENT ON TABLE stock_batch_usage IS 'Tracks which batches were used in each sale (audit trail)';
COMMENT ON COLUMN stock_batch_usage.unit_cost IS 'Cost per unit from the batch at time of sale';

-- ============================================
-- 3. Modify transaction_items table
-- ============================================
ALTER TABLE transaction_items
ADD COLUMN IF NOT EXISTS cost_of_goods DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit DECIMAL(15,2) DEFAULT 0;

COMMENT ON COLUMN transaction_items.cost_of_goods IS 'Total COGS (HPP) calculated using FIFO';
COMMENT ON COLUMN transaction_items.profit IS 'Profit = subtotal - cost_of_goods';

-- ============================================
-- 4. Create RPC function for atomic batch update
-- ============================================
CREATE OR REPLACE FUNCTION decrement_batch_quantity(
  batch_id UUID,
  qty INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE stock_batches
  SET quantity_remaining = quantity_remaining - qty
  WHERE id = batch_id
    AND quantity_remaining >= qty;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient batch quantity or batch not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION decrement_batch_quantity IS 'Atomically decrement batch quantity with validation';

-- ============================================
-- 5. Enable RLS (if not already enabled)
-- ============================================
ALTER TABLE stock_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_batch_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
DO $$ 
BEGIN
  -- Drop policies if they exist
  DROP POLICY IF EXISTS "Allow authenticated users to read stock_batches" ON stock_batches;
  DROP POLICY IF EXISTS "Allow authenticated users to insert stock_batches" ON stock_batches;
  DROP POLICY IF EXISTS "Allow authenticated users to update stock_batches" ON stock_batches;
  DROP POLICY IF EXISTS "Allow authenticated users to read stock_batch_usage" ON stock_batch_usage;
  DROP POLICY IF EXISTS "Allow authenticated users to insert stock_batch_usage" ON stock_batch_usage;
  
  -- Create new policies
  CREATE POLICY "Allow authenticated users to read stock_batches"
    ON stock_batches FOR SELECT
    TO authenticated
    USING (true);
    
  CREATE POLICY "Allow authenticated users to insert stock_batches"
    ON stock_batches FOR INSERT
    TO authenticated
    WITH CHECK (true);
    
  CREATE POLICY "Allow authenticated users to update stock_batches"
    ON stock_batches FOR UPDATE
    TO authenticated
    USING (true);
    
  CREATE POLICY "Allow authenticated users to read stock_batch_usage"
    ON stock_batch_usage FOR SELECT
    TO authenticated
    USING (true);
    
  CREATE POLICY "Allow authenticated users to insert stock_batch_usage"
    ON stock_batch_usage FOR INSERT
    TO authenticated
    WITH CHECK (true);
END $$;

-- ============================================
-- 6. Data Migration (Optional)
-- ============================================
-- Migrate existing stock_entries to batches
-- Note: quantity_remaining will be 0 for historical data

INSERT INTO stock_batches (
  product_id,
  stock_entry_id,
  purchase_price,
  quantity_initial,
  quantity_remaining,
  batch_date
)
SELECT 
  se.product_id,
  se.id,
  COALESCE(se.purchase_price, 0) as purchase_price,
  se.quantity,
  0 as quantity_remaining,  -- Historical data assumed sold
  se.created_at
FROM stock_entries se
WHERE NOT EXISTS (
  SELECT 1 FROM stock_batches sb WHERE sb.stock_entry_id = se.id
)
ON CONFLICT DO NOTHING;

-- ============================================
-- Migration Complete
-- ============================================
-- Verify tables created:
SELECT 
  'stock_batches' as table_name, 
  COUNT(*) as row_count 
FROM stock_batches
UNION ALL
SELECT 
  'stock_batch_usage' as table_name, 
  COUNT(*) as row_count 
FROM stock_batch_usage;
