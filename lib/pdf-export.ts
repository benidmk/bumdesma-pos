"use client"

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Product } from './types'
import { formatCurrency } from './utils'

export function exportStockToPDF(products: Product[]) {
  const doc = new jsPDF()
  
  // Header
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('BUMDESMA', 105, 15, { align: 'center' })
  
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text('Laporan Stok Barang', 105, 23, { align: 'center' })
  
  // Date
  doc.setFontSize(10)
  const now = new Date()
  const dateStr = now.toLocaleDateString('id-ID', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  doc.text(`Tanggal Cetak: ${dateStr}`, 14, 35)
  
  // Summary
  const totalProducts = products.length
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0)
  const lowStockCount = products.filter(p => p.stock <= p.low_stock_threshold).length
  const totalValue = products.reduce((sum, p) => sum + (p.sell_price * p.stock), 0)
  
  doc.setFontSize(10)
  doc.text(`Total Jenis Barang: ${totalProducts}`, 14, 43)
  doc.text(`Total Unit Stok: ${totalStock}`, 14, 49)
  doc.text(`Stok Menipis: ${lowStockCount} produk`, 14, 55)
  doc.text(`Estimasi Nilai Stok: ${formatCurrency(totalValue)}`, 14, 61)
  
  // Table
  const tableData = products.map((p, index) => [
    (index + 1).toString(),
    p.name,
    p.category.charAt(0).toUpperCase() + p.category.slice(1),
    formatCurrency(p.buy_price),
    formatCurrency(p.sell_price),
    p.stock.toString(),
    p.stock <= p.low_stock_threshold ? '⚠️ Rendah' : 'Aman'
  ])
  
  autoTable(doc, {
    startY: 68,
    head: [['No', 'Nama Produk', 'Kategori', 'Harga Modal', 'Harga Jual', 'Stok', 'Status']],
    body: tableData,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [34, 139, 34], // Green color
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 50 },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'right', cellWidth: 28 },
      4: { halign: 'right', cellWidth: 28 },
      5: { halign: 'center', cellWidth: 15 },
      6: { halign: 'center', cellWidth: 22 },
    },
  })
  
  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(128)
    doc.text(
      `Halaman ${i} dari ${pageCount} - BUMDESMA POS`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    )
  }
  
  // Save
  const fileName = `Laporan-Stok-BUMDESMA-${now.toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

// Export transactions/debt report
export function exportDebtReportToPDF(data: {
  customers: Array<{ name: string; totalDebt: number; transactionCount: number }>
  totalDebt: number
}) {
  const doc = new jsPDF()
  
  // Header
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('BUMDESMA', 105, 15, { align: 'center' })
  
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text('Laporan Piutang Pelanggan', 105, 23, { align: 'center' })
  
  // Date
  doc.setFontSize(10)
  const now = new Date()
  const dateStr = now.toLocaleDateString('id-ID', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  doc.text(`Tanggal Cetak: ${dateStr}`, 14, 35)
  
  // Summary
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`Total Piutang: ${formatCurrency(data.totalDebt)}`, 14, 45)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Jumlah Pelanggan: ${data.customers.length}`, 14, 52)
  
  // Table
  const tableData = data.customers.map((c, index) => [
    (index + 1).toString(),
    c.name,
    c.transactionCount.toString(),
    formatCurrency(c.totalDebt)
  ])
  
  autoTable(doc, {
    startY: 58,
    head: [['No', 'Nama Pelanggan', 'Jumlah Transaksi', 'Total Hutang']],
    body: tableData,
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [220, 53, 69], // Red color for debt
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [255, 245, 245],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { cellWidth: 80 },
      2: { halign: 'center', cellWidth: 40 },
      3: { halign: 'right', cellWidth: 45 },
    },
  })
  
  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(128)
    doc.text(
      `Halaman ${i} dari ${pageCount} - BUMDESMA POS`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    )
  }
  
  // Save
  const fileName = `Laporan-Piutang-BUMDESMA-${now.toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

// Sales Report Types
interface SalesReportTransaction {
  invoice_number: string
  customer_name: string
  items: Array<{ name: string; quantity: number; subtotal: number }>
  total_amount: number
  paid_amount: number
  status: string
  created_at: string
}

interface SalesReportData {
  totalSales: number
  totalPayments: number
  totalOutstanding: number
  transactionCount: number
  transactions: SalesReportTransaction[]
  periodLabel: string
}

// Export sales report to PDF
export function exportSalesReportToPDF(data: SalesReportData) {
  const doc = new jsPDF()
  
  // Header
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('BUMDESMA', 105, 15, { align: 'center' })
  
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text('Laporan Penjualan', 105, 23, { align: 'center' })
  
  // Period & Date
  doc.setFontSize(10)
  const now = new Date()
  const dateStr = now.toLocaleDateString('id-ID', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  doc.text(`Periode: ${data.periodLabel}`, 14, 35)
  doc.text(`Tanggal Cetak: ${dateStr}`, 14, 41)
  
  // Summary metrics box
  doc.setFillColor(245, 245, 245)
  doc.rect(14, 48, 182, 28, 'F')
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Ringkasan:', 18, 56)
  
  doc.setFont('helvetica', 'normal')
  doc.text(`Total Penjualan: ${formatCurrency(data.totalSales)}`, 18, 63)
  doc.text(`Jumlah Transaksi: ${data.transactionCount}`, 18, 70)
  doc.text(`Total Pembayaran: ${formatCurrency(data.totalPayments)}`, 100, 63)
  doc.text(`Piutang Tertunggak: ${formatCurrency(data.totalOutstanding)}`, 100, 70)
  
  // Transactions table with items detail
  const tableData = data.transactions.map((tx, index) => {
    // Format items list
    const itemsList = tx.items.map(item => 
      `${item.name} (${item.quantity}x)`
    ).join(', ')
    
    const statusLabel = tx.status === 'paid' ? 'Lunas' :
                        tx.status === 'partial' ? 'Sebagian' : 'Belum Lunas'
    
    return [
      (index + 1).toString(),
      tx.invoice_number,
      tx.customer_name,
      itemsList || '-',
      formatCurrency(tx.total_amount),
      statusLabel
    ]
  })
  
  autoTable(doc, {
    startY: 82,
    head: [['No', 'Invoice', 'Pelanggan', 'Barang yang Dibeli', 'Total', 'Status']],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [34, 139, 34],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 28, fontSize: 7 },
      2: { cellWidth: 30 },
      3: { cellWidth: 60 },
      4: { halign: 'right', cellWidth: 28 },
      5: { halign: 'center', cellWidth: 22 },
    },
  })
  
  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(128)
    doc.text(
      `Halaman ${i} dari ${pageCount} - BUMDESMA POS`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    )
  }
  
  // Save
  const fileName = `Laporan-Penjualan-BUMDESMA-${now.toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}
