// Seeding script for BUMDESMA POS
// Run with: npm run seed

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials!')
  console.error('Please make sure .env.local has:')
  console.error('  NEXT_PUBLIC_SUPABASE_URL=...')
  console.error('  NEXT_PUBLIC_SUPABASE_ANON_KEY=...')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function seed() {
  console.log('🌱 Starting database seeding...')

  // Hash passwords
  const adminPasswordHash = await bcrypt.hash('admin123', 10)
  const staffPasswordHash = await bcrypt.hash('staff123', 10)

  // 1. Seed Users
  console.log('Creating users...')
  const { error: usersError } = await supabase.from('users').upsert([
    {
      email: 'admin@bumdesma.com',
      password_hash: adminPasswordHash,
      name: 'Administrator',
      role: 'admin'
    },
    {
      email: 'staff@bumdesma.com',
      password_hash: staffPasswordHash,
      name: 'Staff Viewer',
      role: 'viewer'
    }
  ], { onConflict: 'email' })

  if (usersError) {
    console.error('Error seeding users:', usersError)
    return
  }
  console.log('✅ Users created')

  // 2. Seed Sample Customers
  console.log('Creating sample customers...')
  const { error: customersError } = await supabase.from('customers').insert([
    { name: 'Pak Budi', phone: '081234567890', address: 'Desa Sukamaju RT 01/02' },
    { name: 'Bu Siti', phone: '082345678901', address: 'Desa Sukamaju RT 03/01' },
    { name: 'Pak Joko', phone: '083456789012', address: 'Desa Harapan RT 02/05' },
    { name: 'Bu Ani', phone: '084567890123', address: 'Desa Harapan RT 01/03' },
    { name: 'Pak Wahyu', phone: '085678901234', address: 'Desa Makmur RT 04/02' },
  ])

  if (customersError && !customersError.message.includes('duplicate')) {
    console.error('Error seeding customers:', customersError)
  } else {
    console.log('✅ Sample customers created')
  }

  // 3. Seed Sample Products
  console.log('Creating sample products...')
  const { error: productsError } = await supabase.from('products').insert([
    // Pupuk
    { name: 'Urea Subsidi 50kg', category: 'pupuk', buy_price: 112500, sell_price: 125000, stock: 100, low_stock_threshold: 20 },
    { name: 'NPK Phonska 50kg', category: 'pupuk', buy_price: 135000, sell_price: 150000, stock: 80, low_stock_threshold: 15 },
    { name: 'ZA Subsidi 50kg', category: 'pupuk', buy_price: 90000, sell_price: 100000, stock: 60, low_stock_threshold: 10 },
    { name: 'SP-36 50kg', category: 'pupuk', buy_price: 130000, sell_price: 145000, stock: 40, low_stock_threshold: 10 },
    { name: 'Organik Petroganik 40kg', category: 'pupuk', buy_price: 22500, sell_price: 30000, stock: 50, low_stock_threshold: 10 },
    
    // Obat
    { name: 'Virtako 100ml', category: 'obat', buy_price: 85000, sell_price: 95000, stock: 30, low_stock_threshold: 5 },
    { name: 'Decis 50ml', category: 'obat', buy_price: 45000, sell_price: 55000, stock: 25, low_stock_threshold: 5 },
    { name: 'Regent 50ml', category: 'obat', buy_price: 65000, sell_price: 75000, stock: 20, low_stock_threshold: 5 },
    { name: 'Roundup 1L', category: 'obat', buy_price: 75000, sell_price: 90000, stock: 15, low_stock_threshold: 3 },
    { name: 'Furadan 3GR 1kg', category: 'obat', buy_price: 55000, sell_price: 65000, stock: 35, low_stock_threshold: 5 },
    
    // Pakan
    { name: 'Pakan Ayam BR-1 50kg', category: 'pakan', buy_price: 340000, sell_price: 365000, stock: 20, low_stock_threshold: 5 },
    { name: 'Pakan Ikan Lele 30kg', category: 'pakan', buy_price: 280000, sell_price: 310000, stock: 15, low_stock_threshold: 3 },
    { name: 'Konsentrat Sapi 50kg', category: 'pakan', buy_price: 185000, sell_price: 210000, stock: 10, low_stock_threshold: 3 },
  ])

  if (productsError && !productsError.message.includes('duplicate')) {
    console.error('Error seeding products:', productsError)
  } else {
    console.log('✅ Sample products created')
  }

  console.log('\n🎉 Seeding completed!')
  console.log('\nDefault credentials:')
  console.log('Admin: admin@bumdesma.com / admin123')
  console.log('Viewer: staff@bumdesma.com / staff123')
}

seed()
