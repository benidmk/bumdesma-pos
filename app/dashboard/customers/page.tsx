"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { supabase } from "@/lib/supabase"
import { Customer } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  Users,
  Loader2,
  Eye
} from "lucide-react"
import Link from "next/link"

interface CustomerWithDebt extends Customer {
  totalDebt: number
  transactionCount: number
}

export default function CustomersPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "admin"

  const [customers, setCustomers] = useState<CustomerWithDebt[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: ""
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchCustomers()
  }, [])

  async function fetchCustomers() {
    try {
      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('name')

      if (customersError) throw customersError

      // Fetch transactions for debt calculation
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('customer_id, total_amount, paid_amount, status')

      if (transactionsError) throw transactionsError

      // Calculate debt per customer
      const customersWithDebt: CustomerWithDebt[] = (customersData || []).map(customer => {
        const customerTransactions = transactionsData?.filter(t => t.customer_id === customer.id) || []
        const totalDebt = customerTransactions
          .filter(t => t.status !== 'paid')
          .reduce((sum, t) => sum + (t.total_amount - t.paid_amount), 0)
        
        return {
          ...customer,
          totalDebt,
          transactionCount: customerTransactions.length
        }
      })

      setCustomers(customersWithDebt)
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast.error('Gagal memuat data pelanggan')
    } finally {
      setLoading(false)
    }
  }

  function openCreateDialog() {
    setEditingCustomer(null)
    setFormData({ name: "", phone: "", address: "" })
    setIsDialogOpen(true)
  }

  function openEditDialog(customer: Customer) {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      phone: customer.phone || "",
      address: customer.address || ""
    })
    setIsDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)

    try {
      const customerData = {
        name: formData.name,
        phone: formData.phone || null,
        address: formData.address || null
      }

      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', editingCustomer.id)

        if (error) throw error
        toast.success('Pelanggan berhasil diperbarui')
      } else {
        const { error } = await supabase
          .from('customers')
          .insert(customerData)

        if (error) throw error
        toast.success('Pelanggan berhasil ditambahkan')
      }

      setIsDialogOpen(false)
      fetchCustomers()
    } catch (error) {
      console.error('Error saving customer:', error)
      toast.error('Gagal menyimpan pelanggan')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(customer: CustomerWithDebt) {
    if (customer.transactionCount > 0) {
      toast.error('Tidak dapat menghapus pelanggan yang memiliki transaksi')
      return
    }

    if (!confirm(`Hapus pelanggan "${customer.name}"?`)) return

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id)

      if (error) throw error
      toast.success('Pelanggan berhasil dihapus')
      fetchCustomers()
    } catch (error) {
      console.error('Error deleting customer:', error)
      toast.error('Gagal menghapus pelanggan')
    }
  }

  // Filter customers
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery)
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pelanggan</h1>
          <p className="text-gray-500">Kelola data petani/pelanggan</p>
        </div>
        
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="bg-green-600 hover:bg-green-700">
                <Plus className="mr-2 h-4 w-4" />
                Tambah Pelanggan
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingCustomer ? "Edit Pelanggan" : "Tambah Pelanggan Baru"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Lengkap *</Label>
                  <Input
                    id="name"
                    placeholder="Nama petani/pelanggan"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">No. HP</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="08xxxxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Alamat</Label>
                  <Textarea
                    id="address"
                    placeholder="Alamat lengkap"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Cari nama atau nomor HP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Daftar Pelanggan ({filteredCustomers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>No. HP</TableHead>
                    <TableHead>Alamat</TableHead>
                    <TableHead className="text-right">Total Hutang</TableHead>
                    <TableHead className="text-center">Transaksi</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.phone || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {customer.address || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {customer.totalDebt > 0 ? (
                          <span className="font-semibold text-red-600">
                            {formatCurrency(customer.totalDebt)}
                          </span>
                        ) : (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            Lunas
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{customer.transactionCount}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <Link href={`/dashboard/customers/${customer.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(customer)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDelete(customer)}
                                disabled={customer.transactionCount > 0}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Tidak ada pelanggan ditemukan</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
