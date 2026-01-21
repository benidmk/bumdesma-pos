import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { hash } from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// GANTI PASSWORD DI SINI
const EMAIL = 'admin@bumdesma.com'  // Email user yang ingin diganti passwordnya
const NEW_PASSWORD = 'Ani2026-'      // Password baru

async function updatePassword() {
  console.log('🔄 Mengupdate password untuk:', EMAIL)
  
  try {
    // Hash password baru
    const passwordHash = await hash(NEW_PASSWORD, 12)
    console.log('✅ Password hash dibuat')
    
    // Update di database
    const { data, error } = await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('email', EMAIL)
      .select()
    
    if (error) {
      throw error
    }
    
    if (data && data.length > 0) {
      console.log('✅ Password berhasil diupdate untuk:', data[0].name)
      console.log('📧 Email:', EMAIL)
      console.log('🔑 Password baru:', NEW_PASSWORD)
    } else {
      console.log('❌ User tidak ditemukan dengan email:', EMAIL)
    }
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

updatePassword()
