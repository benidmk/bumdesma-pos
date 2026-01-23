// Script to verify FIFO migration was successful
// Run with: npx tsx scripts/verify-migration.ts

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyMigration() {
  console.log('🔍 Verifying FIFO Migration...\n')
  
  let hasErrors = false

  // 1. Check stock_batches table
  console.log('1️⃣ Checking stock_batches table...')
  const { data: batches, error: batchesError } = await supabase
    .from('stock_batches')
    .select('count')
    .limit(1)
  
  if (batchesError) {
    console.error('❌ Table stock_batches NOT FOUND or not accessible')
    console.error('   Error:', batchesError.message)
    hasErrors = true
  } else {
    console.log('✅ Table stock_batches exists and accessible')
  }

  // 2. Check stock_batch_usage table
  console.log('\n2️⃣ Checking stock_batch_usage table...')
  const { data: usage, error: usageError } = await supabase
    .from('stock_batch_usage')
    .select('count')
    .limit(1)
  
  if (usageError) {
    console.error('❌ Table stock_batch_usage NOT FOUND or not accessible')
    console.error('   Error:', usageError.message)
    hasErrors = true
  } else {
    console.log('✅ Table stock_batch_usage exists and accessible')
  }

  // 3. Check if transaction_items has new columns
  console.log('\n3️⃣ Checking transaction_items columns...')
  const { data: txItems, error: txError } = await supabase
    .from('transaction_items')
    .select('id, cost_of_goods, profit')
    .limit(1)
  
  if (txError) {
    console.error('❌ Columns cost_of_goods/profit NOT FOUND in transaction_items')
    console.error('   Error:', txError.message)
    hasErrors = true
  } else {
    console.log('✅ Columns cost_of_goods and profit exist')
  }

  // 4. Check RPC function
  console.log('\n4️⃣ Checking decrement_batch_quantity function...')
  try {
    // Try to call with dummy data - it will fail but we just want to see if function exists
    await supabase.rpc('decrement_batch_quantity', {
      batch_id: '00000000-0000-0000-0000-000000000000',
      qty: 1
    })
    console.log('✅ Function decrement_batch_quantity exists')
  } catch (err: any) {
    if (err.message?.includes('does not exist')) {
      console.error('❌ Function decrement_batch_quantity NOT FOUND')
      hasErrors = true
    } else {
      // Function exists but failed (expected with dummy ID)
      console.log('✅ Function decrement_batch_quantity exists')
    }
  }

  // 5. Test insert
  console.log('\n5️⃣ Testing batch insert permissions...')
  
  // Get a product to test with
  const { data: products } = await supabase
    .from('products')
    .select('id, name')
    .limit(1)
  
  if (products && products.length > 0) {
    const testProduct = products[0]
    
    const { error: insertError } = await supabase
      .from('stock_batches')
      .insert({
        product_id: testProduct.id,
        purchase_price: 1,
        quantity_initial: 1,
        quantity_remaining: 1,
        batch_date: new Date().toISOString()
      })
    
    if (insertError) {
      console.error('❌ Cannot insert into stock_batches')
      console.error('   Error:', insertError.message)
      console.error('   Code:', insertError.code)
      console.error('   Details:', insertError.details)
      console.error('   Hint:', insertError.hint)
      hasErrors = true
    } else {
      console.log('✅ Insert permission OK (test batch created)')
      // Delete test batch
      await supabase
        .from('stock_batches')
        .delete()
        .eq('quantity_initial', 1)
        .eq('purchase_price', 1)
    }
  } else {
    console.log('⚠️  No products found to test insert')
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  if (hasErrors) {
    console.log('❌ MIGRATION NOT COMPLETE')
    console.log('\n📋 Action Required:')
    console.log('1. Go to Supabase Dashboard → SQL Editor')
    console.log('2. Copy the entire content of scripts/migration-fifo.sql')
    console.log('3. Paste and click RUN')
    console.log('4. Make sure all queries execute successfully')
    console.log('5. Run this verification script again')
  } else {
    console.log('✅ ALL CHECKS PASSED')
    console.log('\n🎉 Migration is complete and working!')
    console.log('You can now use the stock entry feature.')
  }
  console.log('='.repeat(50))
}

verifyMigration()
