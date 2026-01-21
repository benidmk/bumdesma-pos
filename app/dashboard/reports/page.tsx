"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { formatCurrency, formatDateTime, formatDate } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  BarChart3,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  FileText
} from "lucide-react"

interface ReportData {
  totalSales: number
  totalPayments: number
  totalOutstanding: number
  transactionCount: number
  topProducts: Array<{ name: string; quantity: number; revenue: number }>
  recentTransactions: Array<{
    id: string
    invoice_number: string
    customer_name: string
    total_amount: number
    status: string
    created_at: string
  }>
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("all")

  useEffect(() => {
    fetchReportData()
  }, [period])

  async function fetchReportData() {
    setLoading(true)
    try {
      // Build date filter
      let dateFilter = null
      const now = new Date()
      if (period === "today") {
        dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      } else if (period === "week") {
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      } else if (period === "month") {
        dateFilter = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      }

      // Fetch transactions
      let transactionQuery = supabase
        .from('transactions')
        .select('*, customers(name)')
        .order('created_at', { ascending: false })

      if (dateFilter) {
        transactionQuery = transactionQuery.gte('created_at', dateFilter)
      }

      const { data: transactions, error: txError } = await transactionQuery

      if (txError) throw txError

      // Fetch payments
      let paymentQuery = supabase.from('payments').select('amount')
      if (dateFilter) {
        paymentQuery = paymentQuery.gte('created_at', dateFilter)
      }
      const { data: payments } = await paymentQuery

      // Fetch transaction items for top products
      const { data: items, error: itemsError } = await supabase
        .from('transaction_items')
        .select('quantity, subtotal, products(name)')

      if (itemsError) throw itemsError

      // Calculate metrics
      const totalSales = transactions?.reduce((sum, t) => sum + t.total_amount, 0) || 0
      const totalPayments = payments?.reduce((sum, p) => sum + p.amount, 0) || 0
      const totalOutstanding = transactions?.reduce((sum, t) => 
        sum + (t.total_amount - t.paid_amount), 0) || 0

      // Calculate top products
      const productMap = new Map<string, { quantity: number; revenue: number }>()
      items?.forEach(item => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const productData = item.products as any
        const productName = productData?.name || 'Unknown'
        const existing = productMap.get(productName) || { quantity: 0, revenue: 0 }
        productMap.set(productName, {
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + item.subtotal
        })
      })

      const topProducts = Array.from(productMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      // Format recent transactions
      const recentTransactions = (transactions || []).slice(0, 10).map(tx => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const customerData = tx.customers as any
        return {
          id: tx.id,
          invoice_number: tx.invoice_number,
          customer_name: customerData?.name || 'Unknown',
          total_amount: tx.total_amount,
          status: tx.status,
          created_at: tx.created_at
        }
      })

      setData({
        totalSales,
        totalPayments,
        totalOutstanding,
        transactionCount: transactions?.length || 0,
        topProducts,
        recentTransactions
      })
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan</h1>
          <p className="text-gray-500">Ringkasan penjualan dan piutang</p>
        </div>
        
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Pilih Periode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hari Ini</SelectItem>
            <SelectItem value="week">7 Hari Terakhir</SelectItem>
            <SelectItem value="month">Bulan Ini</SelectItem>
            <SelectItem value="all">Semua Waktu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Penjualan
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(data?.totalSales || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {data?.transactionCount || 0} transaksi
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Pembayaran
            </CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data?.totalPayments || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Uang yang sudah diterima
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Piutang Tertunggak
            </CardTitle>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(data?.totalOutstanding || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Belum dibayar
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Rasio Pelunasan
            </CardTitle>
            <BarChart3 className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {data?.totalSales 
                ? Math.round((data.totalPayments / data.totalSales) * 100) 
                : 0}%
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Dari total penjualan
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Produk Terlaris
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.topProducts && data.topProducts.length > 0 ? (
              <div className="space-y-3">
                {data.topProducts.map((product, index) => (
                  <div 
                    key={product.name}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-200 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-gray-500">Terjual: {product.quantity}</p>
                      </div>
                    </div>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(product.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Belum ada data penjualan</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Transaksi Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentTransactions && data.recentTransactions.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Pelanggan</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono text-xs">
                          {tx.invoice_number}
                        </TableCell>
                        <TableCell className="text-sm">{tx.customer_name}</TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(tx.total_amount)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={
                              tx.status === 'paid' ? 'default' :
                              tx.status === 'partial' ? 'secondary' : 'destructive'
                            }
                            className={`text-xs ${
                              tx.status === 'paid' ? 'bg-green-100 text-green-700' :
                              tx.status === 'partial' ? 'bg-yellow-100 text-yellow-700' : ''
                            }`}
                          >
                            {tx.status === 'paid' ? 'Lunas' :
                             tx.status === 'partial' ? 'Sebagian' : 'Belum'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Belum ada transaksi</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
