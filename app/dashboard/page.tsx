"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { formatCurrency } from "@/lib/utils"
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  FileText,
  Users,
  Loader2
} from "lucide-react"
import Link from "next/link"

interface DashboardData {
  totalDebt: number
  estimatedProfit: number
  lowStockCount: number
  totalTransactions: number
  topDebtors: Array<{
    id: string
    name: string
    totalDebt: number
  }>
  lowStockProducts: Array<{
    id: string
    name: string
    stock: number
    threshold: number
  }>
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch transactions with customer info
        const { data: transactions } = await supabase
          .from('transactions')
          .select(`
            id,
            total_amount,
            paid_amount,
            status,
            customer_id,
            customers (id, name)
          `)
          .neq('status', 'paid')

        // Fetch low stock products
        const { data: products } = await supabase
          .from('products')
          .select('id, name, stock, low_stock_threshold, buy_price, sell_price')

        // Calculate metrics
        const totalDebt = transactions?.reduce((sum, t) => 
          sum + (t.total_amount - t.paid_amount), 0) || 0

        const estimatedProfit = products?.reduce((sum, p) => 
          sum + ((p.sell_price - p.buy_price) * p.stock), 0) || 0

        const lowStockProducts = products?.filter(p => 
          p.stock <= p.low_stock_threshold) || []

        // Group debts by customer
        const debtByCustomer = new Map<string, { id: string; name: string; totalDebt: number }>()
        transactions?.forEach(t => {
          const customerId = t.customer_id
          const customerName = (t.customers as { id: string; name: string })?.name || 'Unknown'
          const debt = t.total_amount - t.paid_amount
          
          if (debtByCustomer.has(customerId)) {
            debtByCustomer.get(customerId)!.totalDebt += debt
          } else {
            debtByCustomer.set(customerId, { id: customerId, name: customerName, totalDebt: debt })
          }
        })

        const topDebtors = Array.from(debtByCustomer.values())
          .sort((a, b) => b.totalDebt - a.totalDebt)
          .slice(0, 5)

        setData({
          totalDebt,
          estimatedProfit,
          lowStockCount: lowStockProducts.length,
          totalTransactions: transactions?.length || 0,
          topDebtors,
          lowStockProducts: lowStockProducts.slice(0, 5).map(p => ({
            id: p.id,
            name: p.name,
            stock: p.stock,
            threshold: p.low_stock_threshold
          }))
        })
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Ringkasan data transaksi dan stok</p>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Piutang
            </CardTitle>
            <DollarSign className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(data?.totalDebt || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {data?.totalTransactions || 0} transaksi belum lunas
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Estimasi Profit
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(data?.estimatedProfit || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Jika semua stok terjual
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Stok Menipis
            </CardTitle>
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {data?.lowStockCount || 0} Produk
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Di bawah batas minimum
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Pelanggan
            </CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {data?.topDebtors?.length || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Dengan piutang aktif
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tables Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Debtors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-500" />
              Piutang Terbesar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.topDebtors && data.topDebtors.length > 0 ? (
              <div className="space-y-3">
                {data.topDebtors.map((debtor, index) => (
                  <Link 
                    key={debtor.id}
                    href={`/dashboard/customers/${debtor.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-50 text-gray-500'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium text-gray-900">{debtor.name}</span>
                    </div>
                    <span className="font-semibold text-red-600">
                      {formatCurrency(debtor.totalDebt)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Belum ada data piutang</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Peringatan Stok
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.lowStockProducts && data.lowStockProducts.length > 0 ? (
              <div className="space-y-3">
                {data.lowStockProducts.map((product) => (
                  <Link
                    key={product.id}
                    href={`/dashboard/products/${product.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900">{product.name}</span>
                    <Badge variant={product.stock === 0 ? "destructive" : "secondary"}>
                      Sisa: {product.stock}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Semua stok aman</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
