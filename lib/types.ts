// Database types for BUMDESMA POS

export type UserRole = 'admin' | 'viewer'
export type ProductCategory = 'pupuk' | 'obat' | 'pakan'
export type TransactionStatus = 'unpaid' | 'partial' | 'paid'

export interface User {
  id: string
  email: string
  password_hash: string
  name: string
  role: UserRole
  created_at: string
}

export interface Customer {
  id: string
  name: string
  phone: string | null
  address: string | null
  created_at: string
}

export interface Product {
  id: string
  name: string
  category: ProductCategory
  buy_price: number
  sell_price: number
  stock: number
  low_stock_threshold: number
  created_at: string
}

export interface Transaction {
  id: string
  customer_id: string
  created_by: string
  invoice_number: string
  total_amount: number
  paid_amount: number
  status: TransactionStatus
  created_at: string
  updated_at: string
  // Joined fields
  customer?: Customer
  created_by_user?: User
  items?: TransactionItem[]
}

export interface TransactionItem {
  id: string
  transaction_id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
  cost_of_goods?: number
  profit?: number
  // Joined fields
  product?: Product
}

export interface Payment {
  id: string
  transaction_id: string
  received_by: string
  amount: number
  notes: string | null
  created_at: string
  // Joined fields
  received_by_user?: User
}

export interface StockBatch {
  id: string
  product_id: string
  stock_entry_id: string | null
  purchase_price: number
  sell_price?: number | null
  quantity_initial: number
  quantity_remaining: number
  batch_date: string
  created_at: string
}

export interface StockBatchUsage {
  id: string
  transaction_item_id: string
  stock_batch_id: string
  quantity_used: number
  unit_cost: number
  created_at: string
}


export interface StockEntry {
  id: string
  product_id: string
  quantity: number
  purchase_price: number
  notes: string | null
  created_by: string | null
  created_at: string
  // Joined fields
  products?: Product
  users?: User
  stock_batches?: StockBatch[]
}

// Cart types for POS
export interface CartItem {
  product: Product
  quantity: number
  subtotal: number
}

// Dashboard metrics
export interface DashboardMetrics {
  totalDebt: number
  estimatedProfit: number
  lowStockCount: number
  totalTransactions: number
  topDebtors: Array<{
    customer: Customer
    totalDebt: number
  }>
}

// Supabase database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Omit<User, 'id' | 'created_at'>
        Update: Partial<Omit<User, 'id'>>
      }
      customers: {
        Row: Customer
        Insert: Omit<Customer, 'id' | 'created_at'>
        Update: Partial<Omit<Customer, 'id'>>
      }
      products: {
        Row: Product
        Insert: Omit<Product, 'id' | 'created_at'>
        Update: Partial<Omit<Product, 'id'>>
      }
      transactions: {
        Row: Transaction
        Insert: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Transaction, 'id'>>
      }
      transaction_items: {
        Row: TransactionItem
        Insert: Omit<TransactionItem, 'id'>
        Update: Partial<Omit<TransactionItem, 'id'>>
      }
      payments: {
        Row: Payment
        Insert: Omit<Payment, 'id' | 'created_at'>
        Update: Partial<Omit<Payment, 'id'>>
      }
    }
  }
}
