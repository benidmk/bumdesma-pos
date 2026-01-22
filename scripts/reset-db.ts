import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function resetDatabase() {
  console.log('⚠️  MEMULAI RESET DATABASE TOTAL...')
  console.log('-----------------------------------')

  try {
    // 1. Hapus Payments (child dari transactions)
    console.log('🗑️  Menghapus data Pembayaran...')
    const { error: payError } = await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000') // delete all
    if (payError) throw payError

    // 2. Hapus Transaction Items (child dari transactions)
    console.log('🗑️  Menghapus detail Transaksi...')
    const { error: itemsError } = await supabase.from('transaction_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (itemsError) throw itemsError

    // 3. Hapus Transactions
    console.log('🗑️  Menghapus Riwayat Transaksi...')
    const { error: txError } = await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (txError) throw txError

    // 4. Hapus Stock Entries
    console.log('🗑️  Menghapus Histori Stok Masuk...')
    const { error: stockError } = await supabase.from('stock_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (stockError && stockError.code !== '42P01') throw stockError // Ignore if table doesn't exist

    // 5. Hapus Customers
    console.log('🗑️  Menghapus data Pelanggan...')
    const { error: custError } = await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (custError) throw custError

    // 6. Hapus Products
    console.log('🗑️  Menghapus data Produk...')
    const { error: prodError } = await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (prodError) throw prodError

    console.log('-----------------------------------')
    console.log('✅ DATABASE BERHASIL DI-RESET!')
    console.log('✅ Semua data transaksi, stok, pelanggan, dan produk telah dihapus.')
    console.log('ℹ️  User admin TETAP ADA. Silakan login dan mulai input data baru.')
    
  } catch (error) {
    console.error('❌ Terjadi kesalahan saat reset:', error)
  }
}

resetDatabase()
