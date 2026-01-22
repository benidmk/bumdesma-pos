"use client"

import React, { useEffect, useState, use } from "react"
import { supabase } from "@/lib/supabase"
import { Customer, Transaction } from "@/lib/types"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Loader2,
  FileText,
  ChevronDown,
  ChevronRight,
  Package
} from "lucide-react"
import Link from "next/link"

interface TransactionWithItems extends Transaction {
  transaction_items?: Array<{
    id: string
    quantity: number
    unit_price: number
    subtotal: number
    products: { name: string } | null
  }>
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [transactions, setTransactions] = useState<TransactionWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTransactions, setExpandedTransactions] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch customer
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', id)
          .single()

        if (customerError) throw customerError
        setCustomer(customerData)

        // Fetch transactions with items
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('transactions')
          .select('*, transaction_items(id, quantity, unit_price, subtotal, products(name))')
          .eq('customer_id', id)
          .order('created_at', { ascending: false })

        if (transactionsError) throw transactionsError
        setTransactions(transactionsData || [])
      } catch (error) {
        console.error('Error fetching customer:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Pelanggan tidak ditemukan</p>
        <Button variant="link" asChild>
          <Link href="/dashboard/customers">Kembali ke daftar pelanggan</Link>
        </Button>
      </div>
    )
  }

  const totalDebt = transactions
    .filter(t => t.status !== 'paid')
    .reduce((sum, t) => sum + (t.total_amount - t.paid_amount), 0)

  const totalTransactionValue = transactions.reduce((sum, t) => sum + t.total_amount, 0)

  const toggleExpanded = (transactionId: string) => {
    setExpandedTransactions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId)
      } else {
        newSet.add(transactionId)
      }
      return newSet
    })
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild className="mb-2">
        <Link href="/dashboard/customers">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Link>
      </Button>

      {/* Customer Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <User className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{customer.name}</h2>
              <p className="text-sm text-gray-500 font-normal">Detail Pelanggan</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">No. HP</p>
                <p className="font-medium">{customer.phone || "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
              <MapPin className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Alamat</p>
                <p className="font-medium">{customer.address || "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50">
              <FileText className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-xs text-gray-500">Total Hutang</p>
                <p className="font-bold text-red-600">{formatCurrency(totalDebt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500">Total Transaksi</p>
                <p className="font-bold text-blue-600">{formatCurrency(totalTransactionValue)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Transaksi ({transactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>No. Invoice</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Barang</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Dibayar</TableHead>
                    <TableHead className="text-right">Sisa</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => {
                    const remaining = transaction.total_amount - transaction.paid_amount
                    const items = transaction.transaction_items || []
                    const isExpanded = expandedTransactions.has(transaction.id)
                    
                    return (
                      <React.Fragment key={transaction.id}>
                        <TableRow>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleExpanded(transaction.id)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {transaction.invoice_number}
                          </TableCell>
                          <TableCell>{formatDateTime(transaction.created_at)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-gray-600">
                              <Package className="h-4 w-4" />
                              <span className="text-sm">{items.length} item</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(transaction.total_amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(transaction.paid_amount)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-red-600">
                            {remaining > 0 ? formatCurrency(remaining) : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={
                                transaction.status === 'paid' ? 'default' :
                                transaction.status === 'partial' ? 'secondary' : 'destructive'
                              }
                              className={
                                transaction.status === 'paid' ? 'bg-green-100 text-green-700' :
                                transaction.status === 'partial' ? 'bg-yellow-100 text-yellow-700' : ''
                              }
                            >
                              {transaction.status === 'paid' ? 'Lunas' :
                               transaction.status === 'partial' ? 'Sebagian' : 'Belum Lunas'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                        {isExpanded && items.length > 0 && (
                          <TableRow key={`${transaction.id}-items`} className="bg-gray-50">
                            <TableCell colSpan={8} className="p-0">
                              <div className="px-12 py-4">
                                <p className="text-sm font-semibold text-gray-700 mb-3">Detail Barang:</p>
                                <div className="bg-white rounded-lg border">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="text-xs">Nama Produk</TableHead>
                                        <TableHead className="text-xs text-center">Jumlah</TableHead>
                                        <TableHead className="text-xs text-right">Harga Satuan</TableHead>
                                        <TableHead className="text-xs text-right">Subtotal</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {items.map((item) => (
                                        <TableRow key={item.id}>
                                          <TableCell className="text-sm">
                                            {item.products?.name || 'Unknown'}
                                          </TableCell>
                                          <TableCell className="text-sm text-center">
                                            {item.quantity}
                                          </TableCell>
                                          <TableCell className="text-sm text-right">
                                            {formatCurrency(item.unit_price)}
                                          </TableCell>
                                          <TableCell className="text-sm text-right font-semibold">
                                            {formatCurrency(item.subtotal)}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Belum ada transaksi</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
