"use client"

import { useEffect, useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { supabase } from "@/lib/supabase"
import { Product, Customer, CartItem } from "@/lib/types"
import { formatCurrency, generateInvoiceNumber } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  User,
  Package,
  Search,
  Loader2,
  Printer,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { PrintReceipt } from "@/components/layout/print-receipt"

export default function POSPage() {
  const { data: session } = useSession()
  
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  
  // POS State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  
  // Customer search
  const [customerSearch, setCustomerSearch] = useState("")
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  
  // Receipt printing
  const [showReceipt, setShowReceipt] = useState(false)
  const [lastInvoice, setLastInvoice] = useState<{
    invoiceNumber: string
    customer: Customer
    items: CartItem[]
    total: number
    date: Date
  } | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [customersRes, productsRes] = await Promise.all([
          supabase.from('customers').select('*').order('name'),
          supabase.from('products').select('*').order('name')
        ])

        if (customersRes.error) throw customersRes.error
        if (productsRes.error) throw productsRes.error

        setCustomers(customersRes.data || [])
        setProducts(productsRes.data || [])
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Gagal memuat data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Close customer dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (!target.closest('.customer-combobox')) {
        setShowCustomerDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Add product to cart
  function addToCart(product: Product) {
    if (product.stock <= 0) {
      toast.error('Stok produk habis')
      return
    }

    const existingItem = cart.find(item => item.product.id === product.id)
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast.error('Stok tidak mencukupi')
        return
      }
      updateQuantity(product.id, existingItem.quantity + 1)
    } else {
      setCart([...cart, {
        product,
        quantity: 1,
        subtotal: product.sell_price
      }])
    }
  }

  // Update item quantity
  function updateQuantity(productId: string, newQuantity: number) {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const product = products.find(p => p.id === productId)
        if (product && newQuantity > product.stock) {
          toast.error('Stok tidak mencukupi')
          return item
        }
        return {
          ...item,
          quantity: newQuantity,
          subtotal: item.product.sell_price * newQuantity
        }
      }
      return item
    }))
  }

  // Remove item from cart
  function removeFromCart(productId: string) {
    setCart(cart.filter(item => item.product.id !== productId))
  }

  // Calculate total
  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0)

  // Show confirmation dialog
  function handleCheckout() {
    if (!selectedCustomer) {
      toast.error('Pilih pelanggan terlebih dahulu')
      return
    }

    if (cart.length === 0) {
      toast.error('Keranjang masih kosong')
      return
    }

    // Show confirmation dialog
    setShowConfirmDialog(true)
  }

  // Checkout after confirmation
  async function handleConfirmCheckout() {
    setShowConfirmDialog(false)
    setIsCheckingOut(true)

    try {
      const invoiceNumber = generateInvoiceNumber()
      
      // Create transaction
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          customer_id: selectedCustomer!.id,
          created_by: session?.user?.id,
          invoice_number: invoiceNumber,
          total_amount: cartTotal,
          paid_amount: 0,
          status: 'unpaid'
        })
        .select()
        .single()

      if (txError) throw txError

      // Create transaction items
      const transactionItems = cart.map(item => ({
        transaction_id: transaction.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.sell_price,
        subtotal: item.subtotal
      }))

      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(transactionItems)

      if (itemsError) throw itemsError

      // Update product stock
      for (const item of cart) {
        const { error: stockError } = await supabase
          .from('products')
          .update({ stock: item.product.stock - item.quantity })
          .eq('id', item.product.id)

        if (stockError) throw stockError
      }

      // Prepare receipt data
      setLastInvoice({
        invoiceNumber,
        customer: selectedCustomer!,
        items: [...cart],
        total: cartTotal,
        date: new Date()
      })

      // Reset state
      setCart([])
      setSelectedCustomer(null)
      setShowReceipt(true)

      // Refresh products to update stock
      const { data: updatedProducts } = await supabase
        .from('products')
        .select('*')
        .order('name')
      
      if (updatedProducts) setProducts(updatedProducts)

      toast.success('Transaksi berhasil disimpan sebagai piutang')
    } catch (error) {
      console.error('Error during checkout:', error)
      toast.error('Gagal menyimpan transaksi')
    } finally {
      setIsCheckingOut(false)
    }
  }

  // Filter products
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
        <h1 className="text-2xl font-bold text-gray-900">Kasir (POS)</h1>
        <p className="text-gray-500">Catat pengambilan barang oleh petani</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Product Selection */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer Selection */}
          <Card className={!selectedCustomer ? "border-2 border-dashed border-orange-300 bg-orange-50" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Pilih Pelanggan
                {!selectedCustomer && (
                  <Badge variant="destructive" className="ml-2">Wajib</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative customer-combobox">
                <Input
                  placeholder="Ketik nama pelanggan..."
                  value={selectedCustomer ? selectedCustomer.name : customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value)
                    setShowCustomerDropdown(true)
                    if (selectedCustomer) setSelectedCustomer(null)
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="h-12 pr-10"
                />
                {selectedCustomer ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-10 w-10"
                    onClick={() => {
                      setSelectedCustomer(null)
                      setCustomerSearch("")
                      setShowCustomerDropdown(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-gray-400" />
                  </Button>
                ) : (
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                )}
                
                {/* Dropdown Suggestions */}
                {showCustomerDropdown && !selectedCustomer && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {customers
                      .filter(c => 
                        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                        c.phone?.includes(customerSearch)
                      )
                      .slice(0, 10)
                      .map((customer) => (
                        <div
                          key={customer.id}
                          className="px-4 py-3 hover:bg-green-50 cursor-pointer border-b last:border-b-0 transition-colors"
                          onClick={() => {
                            setSelectedCustomer(customer)
                            setCustomerSearch("")
                            setShowCustomerDropdown(false)
                          }}
                        >
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          {customer.phone && (
                            <div className="text-sm text-gray-500">{customer.phone}</div>
                          )}
                          {customer.address && (
                            <div className="text-xs text-gray-400 truncate">{customer.address}</div>
                          )}
                        </div>
                      ))}
                    {customers.filter(c => 
                      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                      c.phone?.includes(customerSearch)
                    ).length === 0 && (
                      <div className="px-4 py-8 text-center text-gray-500">
                        <User className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">Pelanggan tidak ditemukan</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Product Search & List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5" />
                Pilih Barang
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Cari produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`p-3 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
                      product.stock <= 0 ? 'opacity-50 bg-gray-50' : 'hover:border-green-300 hover:bg-green-50'
                    }`}
                    onClick={() => product.stock > 0 && addToCart(product)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{product.name}</h4>
                        <p className="text-sm text-green-600 font-semibold">
                          {formatCurrency(product.sell_price)}
                        </p>
                      </div>
                      <Badge 
                        variant={product.stock === 0 ? "destructive" : "secondary"}
                        className="ml-2"
                      >
                        {product.stock}
                      </Badge>
                    </div>
                    {product.stock <= 0 && (
                      <p className="text-xs text-red-500 mt-1">Stok habis</p>
                    )}
                  </div>
                ))}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Tidak ada produk ditemukan</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Cart */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingCart className="h-5 w-5" />
                Keranjang
                {cart.length > 0 && (
                  <Badge className="ml-2">{cart.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.length > 0 ? (
                <>
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.product.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(item.product.sell_price)} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-600"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Separator />

                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total</span>
                    <span className="text-green-600">{formatCurrency(cartTotal)}</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Keranjang kosong</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-lg"
                disabled={!selectedCustomer || cart.length === 0 || isCheckingOut}
                onClick={handleCheckout}
              >
                {isCheckingOut ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-5 w-5 mr-2" />
                )}
                Simpan Piutang
              </Button>
              {!selectedCustomer && cart.length > 0 && (
                <p className="text-xs text-orange-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Pilih pelanggan terlebih dahulu
                </p>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-orange-500" />
              Konfirmasi Transaksi
            </DialogTitle>
            <DialogDescription>
              Pastikan data transaksi sudah benar sebelum menyimpan. Data yang sudah disimpan tidak dapat diubah.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Customer Info */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-gray-700">Pelanggan</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{selectedCustomer?.name}</p>
              {selectedCustomer?.phone && (
                <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
              )}
            </div>

            {/* Items Summary */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-5 w-5 text-gray-600" />
                <span className="font-semibold text-gray-700">Barang yang Dibeli</span>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Produk</TableHead>
                      <TableHead className="text-center">Jumlah</TableHead>
                      <TableHead className="text-right">Harga Satuan</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item) => (
                      <TableRow key={item.product.id}>
                        <TableCell className="font-medium">{item.product.name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.product.sell_price)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(item.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Total */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-700">Total Keseluruhan</span>
                <span className="text-2xl font-bold text-green-600">{formatCurrency(cartTotal)}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">Status: Piutang (Belum Dibayar)</p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              onClick={handleConfirmCheckout}
              disabled={isCheckingOut}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isCheckingOut ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Ya, Simpan Transaksi
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Print Modal */}
      {showReceipt && lastInvoice && (
        <PrintReceipt
          invoice={lastInvoice}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  )
}
