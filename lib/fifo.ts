// FIFO Stock Management Utilities
// Handles FIFO (First In First Out) batch allocation and COGS calculation

import { supabase } from './supabase'
import { StockBatch } from './types'

export interface BatchAllocation {
  batch_id: string
  quantity: number
  unit_cost: number
  unit_sell_price: number
}

export interface AllocationResult {
  allocations: BatchAllocation[]
  totalCOGS: number
  totalRevenue: number
  success: boolean
  error?: string
}

/**
 * Get available batches for a product in FIFO order (oldest first)
 * @param productId - Product UUID
 * @returns Array of batches with remaining stock
 */
export async function getAvailableBatches(
  productId: string
): Promise<StockBatch[]> {
  const { data, error } = await supabase
    .from('stock_batches')
    .select('*')
    .eq('product_id', productId)
    .gt('quantity_remaining', 0)
    .order('batch_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching batches:', error)
    throw error
  }
  
  return data || []
}

/**
 * Allocate stock using FIFO method and calculate COGS and Revenue
 * @param batches - Available batches (must be sorted by date ascending)
 * @param quantityNeeded - Quantity to allocate
 * @param defaultSellPrice - Default product sell price (fallback if batch has no sell_price)
 * @returns Allocation result with COGS and Revenue
 */
export function allocateStock(
  batches: StockBatch[],
  quantityNeeded: number,
  defaultSellPrice: number
): AllocationResult {
  const allocations: BatchAllocation[] = []
  let remaining = quantityNeeded
  let totalCOGS = 0
  let totalRevenue = 0

  // Allocate from oldest batches first (FIFO)
  for (const batch of batches) {
    if (remaining <= 0) break

    const toUse = Math.min(remaining, batch.quantity_remaining)
    
    // Use batch sell price if available, otherwise use default
    const sellPrice = batch.sell_price ?? defaultSellPrice
    
    allocations.push({
      batch_id: batch.id,
      quantity: toUse,
      unit_cost: batch.purchase_price,
      unit_sell_price: sellPrice
    })

    totalCOGS += toUse * batch.purchase_price
    totalRevenue += toUse * sellPrice
    remaining -= toUse
  }

  // Check if we allocated enough
  if (remaining > 0) {
    return {
      allocations: [],
      totalCOGS: 0,
      totalRevenue: 0,
      success: false,
      error: `Insufficient stock in batches. Need ${quantityNeeded}, but only ${quantityNeeded - remaining} available in batches.`
    }
  }

  return {
    allocations,
    totalCOGS,
    totalRevenue,
    success: true
  }
}

/**
 * Create stock batch usage records and update batch quantities
 * @param transactionItemId - Transaction item UUID
 * @param allocations - Batch allocations to record
 */
export async function recordBatchUsage(
  transactionItemId: string,
  allocations: BatchAllocation[]
): Promise<void> {
  // Insert usage records with both cost and sell price
  const usageRecords = allocations.map(allocation => ({
    transaction_item_id: transactionItemId,
    stock_batch_id: allocation.batch_id,
    quantity_used: allocation.quantity,
    unit_cost: allocation.unit_cost
  }))

  const { error: usageError } = await supabase
    .from('stock_batch_usage')
    .insert(usageRecords)

  if (usageError) {
    console.error('Error recording batch usage:', usageError)
    throw usageError
  }

  // Update batch quantities
  for (const allocation of allocations) {
    const { error: updateError } = await supabase.rpc('decrement_batch_quantity', {
      batch_id: allocation.batch_id,
      qty: allocation.quantity
    })

    if (updateError) {
      console.error('Error updating batch quantity:', updateError)
      throw updateError
    }
  }
}

/**
 * Calculate average cost per unit from allocations
 * @param allocations - Batch allocations
 * @param quantity - Total quantity
 * @returns Average cost per unit
 */
export function calculateAverageCost(
  allocations: BatchAllocation[],
  quantity: number
): number {
  if (quantity === 0) return 0
  
  const totalCost = allocations.reduce(
    (sum, allocation) => sum + (allocation.quantity * allocation.unit_cost),
    0
  )
  
  return totalCost / quantity
}
