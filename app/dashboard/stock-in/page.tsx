"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { supabase } from "@/lib/supabase"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PackagePlus, Loader2, Plus, Package, History } from "lucide-react"

interface Product {
  id: string
  name: string
  stock: number
  category: string
}

interface StockEntry {
  id: string
  quantity: number
  purchase_price: number
  notes: string | null
  created_at: string
  products: { name: string } | null
  users: { name: string } | null
}

export default function StockInPage() {
  const { data: session } = useSession()
  const [products, setProducts] = useState<Product[]>([])
  const [entries, setEntries] = useState<StockEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Form state
  const [selectedProductId, setSelectedProductId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [purchasePrice, setPurchasePrice] = useState("")
  const [notes, setNotes] = useState("")

  // Filter
  const [filterProduct, setFilterProduct] = useState("all")

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, stock, category')
        .order('name')

      console.log('Products fetch result:', { 
        productsData, 
        productsError,
        errorDetails: productsError ? JSON.stringify(productsError) : 'none'
      })
      
      if (productsError) {
        console.error('Products error details:', JSON.stringify(productsError, null, 2))
        toast.error('Gagal memuat produk')
      }

      setProducts(productsData || [])

      // Fetch stock entries - wrap in try-catch since table might not exist yet
      try {
        const { data: entriesData, error: entriesError } = await supabase
          .from('stock_entries')
          .select('*, products(name), users(name)')
          .order('created_at', { ascending: false })
          .limit(100)

        if (entriesError) {
          console.log('Stock entries error (might be expected if table not created):', entriesError)
        } else {
          setEntries(entriesData || [])
        }
      } catch (entriesErr) {
        console.log('Stock entries table might not exist yet')
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!selectedProductId || !quantity) {
      toast.error('Pilih produk dan masukkan jumlah')
      return
    }

    const qty = parseInt(quantity)
    if (qty <= 0) {
      toast.error('Jumlah harus lebih dari 0')
      return
    }

    setSubmitting(true)
    try {
      // Get current product stock
      const selectedProduct = products.find(p => p.id === selectedProductId)
      if (!selectedProduct) {
        toast.error('Produk tidak ditemukan')
        return
      }

      // Insert stock entry
      const { error: entryError } = await supabase
        .from('stock_entries')
        .insert({
          product_id: selectedProductId,
          quantity: qty,
          purchase_price: purchasePrice ? parseFloat(purchasePrice) : 0,
          notes: notes || null,
          created_by: (session?.user as { id?: string })?.id || null
        })

      if (entryError) throw entryError

      // Update product stock
      const newStock = selectedProduct.stock + qty
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', selectedProductId)

      if (updateError) throw updateError

      toast.success(`Stok ${selectedProduct.name} berhasil ditambah ${qty} unit`)
      
      // Reset form
      setSelectedProductId("")
      setQuantity("")
      setPurchasePrice("")
      setNotes("")
      setDialogOpen(false)
      
      // Refresh data
      fetchData()
    } catch (error) {
      console.error('Error adding stock:', error)
      toast.error('Gagal menambah stok')
    } finally {
      setSubmitting(false)
    }
  }

  // Filter entries
  const filteredEntries = filterProduct === "all" 
    ? entries 
    : entries.filter(e => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const productData = e.products as any
        return productData?.name === filterProduct
      })

  // Get selected product info
  const selectedProduct = products.find(p => p.id === selectedProductId)

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
          <h1 className="text-2xl font-bold text-gray-900">Stok Masuk</h1>
          <p className="text-gray-500">Catat penambahan stok barang</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Stok
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PackagePlus className="h-5 w-5 text-green-600" />
                Tambah Stok Masuk
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product">Pilih Produk * ({products.length} tersedia)</Label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih produk..." />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[9999] max-h-60">
                    {products.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">Tidak ada produk</div>
                    ) : (
                      products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedProduct && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Stok Saat Ini:</span>
                    <span className="font-semibold text-gray-900">{selectedProduct.stock} unit</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="quantity">Jumlah Masuk *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Masukkan jumlah"
                />
              </div>

              {selectedProduct && quantity && parseInt(quantity) > 0 && (
                <div className="rounded-lg bg-green-50 p-3 border border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-700">Stok Setelah Update:</span>
                    <span className="font-bold text-green-700">
                      {selectedProduct.stock + parseInt(quantity)} unit
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="purchasePrice">Harga Beli per Unit (Opsional)</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  min="0"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="Rp 0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Catatan (Opsional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Pembelian dari Supplier ABC"
                  rows={2}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={submitting || !selectedProductId || !quantity}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <PackagePlus className="h-4 w-4 mr-2" />
                  )}
                  Simpan
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Entri Stok
            </CardTitle>
            <History className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entries.length}</div>
            <p className="text-xs text-gray-500">Catatan stok masuk</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Unit Masuk
            </CardTitle>
            <Package className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +{entries.reduce((sum, e) => sum + e.quantity, 0)}
            </div>
            <p className="text-xs text-gray-500">Unit barang</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Nilai Beli
            </CardTitle>
            <PackagePlus className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(entries.reduce((sum, e) => sum + (e.purchase_price * e.quantity), 0))}
            </div>
            <p className="text-xs text-gray-500">Modal pembelian</p>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Riwayat Stok Masuk
            </CardTitle>
            <Select value={filterProduct} onValueChange={setFilterProduct}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter produk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Produk</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.name}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEntries.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead className="text-center">Jumlah</TableHead>
                    <TableHead className="text-right">Harga Beli</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const productData = entry.products as any
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm text-gray-600">
                          {formatDateTime(entry.created_at)}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{productData?.name || 'Unknown'}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-medium text-green-700">
                            +{entry.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {entry.purchase_price > 0 ? formatCurrency(entry.purchase_price) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {entry.purchase_price > 0 
                            ? formatCurrency(entry.purchase_price * entry.quantity) 
                            : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 max-w-[200px] truncate">
                          {entry.notes || '-'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <PackagePlus className="h-12 w-12 mb-3 text-gray-300" />
              <p>Belum ada riwayat stok masuk</p>
              <p className="text-sm">Klik tombol "Tambah Stok" untuk menambah</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
