"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { supabase } from "@/lib/supabase"
import { Customer, Transaction } from "@/lib/types"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { toast } from "sonner"
import { 
  Search, 
  CreditCard,
  Loader2,
  CheckCircle,
  User,
  FileText
} from "lucide-react"

interface TransactionWithCustomer extends Transaction {
  customers: Customer
}

export default function PaymentsPage() {
  const { data: session } = useSession()
  
  const [customers, setCustomers] = useState<Customer[]>([])
  const [transactions, setTransactions] = useState<TransactionWithCustomer[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filter state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  
  // Payment dialog state
  const [paymentDialog, setPaymentDialog] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithCustomer | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [customersRes, transactionsRes] = await Promise.all([
        supabase.from('customers').select('*').order('name'),
        supabase
          .from('transactions')
          .select('*, customers(*)')
          .neq('status', 'paid')
          .order('created_at', { ascending: false })
      ])

      if (customersRes.error) throw customersRes.error
      if (transactionsRes.error) throw transactionsRes.error

      setCustomers(customersRes.data || [])
      setTransactions(transactionsRes.data as TransactionWithCustomer[] || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  function openPaymentDialog(transaction: TransactionWithCustomer) {
    setSelectedTransaction(transaction)
    setPaymentAmount("")
    setPaymentNotes("")
    setPaymentDialog(true)
  }

  async function handlePayment() {
    if (!selectedTransaction || !paymentAmount) return

    const amount = parseFloat(paymentAmount)
    const remaining = selectedTransaction.total_amount - selectedTransaction.paid_amount

    if (amount <= 0) {
      toast.error('Masukkan nominal yang valid')
      return
    }

    if (amount > remaining) {
      toast.error('Nominal melebihi sisa hutang')
      return
    }

    setIsProcessing(true)

    try {
      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          transaction_id: selectedTransaction.id,
          received_by: session?.user?.id,
          amount: amount,
          notes: paymentNotes || null
        })

      if (paymentError) throw paymentError

      // Update transaction
      const newPaidAmount = selectedTransaction.paid_amount + amount
      const newStatus = newPaidAmount >= selectedTransaction.total_amount ? 'paid' : 'partial'

      const { error: txError } = await supabase
        .from('transactions')
        .update({
          paid_amount: newPaidAmount,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTransaction.id)

      if (txError) throw txError

      toast.success(
        newStatus === 'paid' 
          ? 'Transaksi telah lunas!' 
          : 'Pembayaran berhasil dicatat'
      )

      setPaymentDialog(false)
      fetchData()
    } catch (error) {
      console.error('Error processing payment:', error)
      toast.error('Gagal memproses pembayaran')
    } finally {
      setIsProcessing(false)
    }
  }

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    const matchesCustomer = selectedCustomerId === "all" || tx.customer_id === selectedCustomerId
    const matchesSearch = tx.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tx.customers.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCustomer && matchesSearch
  })

  // Calculate totals
  const totalUnpaid = filteredTransactions.reduce((sum, tx) => 
    sum + (tx.total_amount - tx.paid_amount), 0)

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pelunasan Hutang</h1>
        <p className="text-gray-500">Catat pembayaran dari petani</p>
      </div>

      {/* Summary Card */}
      <Card className="border-l-4 border-l-red-500">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Piutang Tertunggak</p>
              <p className="text-3xl font-bold text-red-600">{formatCurrency(totalUnpaid)}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Cari invoice atau nama..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Filter Pelanggan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Pelanggan</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Transaksi Belum Lunas ({filteredTransactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Dibayar</TableHead>
                    <TableHead className="text-right">Sisa</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => {
                    const remaining = tx.total_amount - tx.paid_amount
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono text-sm">{tx.invoice_number}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            {tx.customers.name}
                          </div>
                        </TableCell>
                        <TableCell>{formatDateTime(tx.created_at)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(tx.total_amount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(tx.paid_amount)}</TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          {formatCurrency(remaining)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={tx.status === 'partial' ? 'secondary' : 'destructive'}
                            className={tx.status === 'partial' ? 'bg-yellow-100 text-yellow-700' : ''}
                          >
                            {tx.status === 'partial' ? 'Sebagian' : 'Belum Lunas'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => openPaymentDialog(tx)}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Bayar
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-300" />
              <p>Tidak ada piutang yang perlu dilunasi</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Input Pembayaran</DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              {/* Transaction Info */}
              <div className="p-4 rounded-lg bg-gray-50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Invoice:</span>
                  <span className="font-mono">{selectedTransaction.invoice_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pelanggan:</span>
                  <span className="font-medium">{selectedTransaction.customers.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Tagihan:</span>
                  <span>{formatCurrency(selectedTransaction.total_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sudah Dibayar:</span>
                  <span>{formatCurrency(selectedTransaction.paid_amount)}</span>
                </div>
                <div className="flex justify-between font-bold text-red-600 pt-2 border-t">
                  <span>Sisa Hutang:</span>
                  <span>{formatCurrency(selectedTransaction.total_amount - selectedTransaction.paid_amount)}</span>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Nominal Pembayaran *</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="text-lg"
                  />
                  <p className="text-xs text-gray-500">
                    Maksimal: {formatCurrency(selectedTransaction.total_amount - selectedTransaction.paid_amount)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Catatan (opsional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Catatan pembayaran..."
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setPaymentDialog(false)}
                >
                  Batal
                </Button>
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handlePayment}
                  disabled={!paymentAmount || isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Konfirmasi
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
