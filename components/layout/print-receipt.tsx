"use client"

import { useRef } from "react"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { Customer, CartItem } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Printer, X } from "lucide-react"

interface PrintReceiptProps {
  invoice: {
    invoiceNumber: string
    customer: Customer
    items: CartItem[]
    total: number
    date: Date
  }
  onClose: () => void
}

export function PrintReceipt({ invoice, onClose }: PrintReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null)

  function handlePrint() {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
        {/* Header - hidden when printing */}
        <div className="flex items-center justify-between p-4 border-b print:hidden">
          <h3 className="font-semibold">Bukti Pengambilan Barang</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Receipt Content */}
        <div ref={receiptRef} className="p-6 print-receipt">
          {/* Store Header */}
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold">BUMDESMA</h1>
            <p className="text-sm text-gray-600">Toko Pertanian</p>
            <div className="border-b-2 border-dashed my-3" />
          </div>

          {/* Invoice Info */}
          <div className="text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-gray-600">No. Invoice:</span>
              <span className="font-mono font-medium">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tanggal:</span>
              <span>{formatDateTime(invoice.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pelanggan:</span>
              <span className="font-medium">{invoice.customer.name}</span>
            </div>
          </div>

          <div className="border-b border-dashed my-3" />

          {/* Items */}
          <div className="space-y-2 mb-4">
            {invoice.items.map((item, index) => (
              <div key={index} className="text-sm">
                <div className="font-medium">{item.product.name}</div>
                <div className="flex justify-between text-gray-600">
                  <span>{item.quantity} × {formatCurrency(item.product.sell_price)}</span>
                  <span>{formatCurrency(item.subtotal)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-b-2 border-dashed my-3" />

          {/* Total */}
          <div className="flex justify-between text-lg font-bold">
            <span>TOTAL</span>
            <span>{formatCurrency(invoice.total)}</span>
          </div>

          <div className="border-b-2 border-dashed my-3" />

          {/* Status */}
          <div className="text-center mt-4">
            <div className="inline-block bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg font-semibold">
              STATUS: BELUM LUNAS
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 text-xs text-gray-500">
            <p className="font-semibold text-gray-700 mb-1">
              * INI BUKAN BUKTI PEMBAYARAN *
            </p>
            <p>Bukti pengambilan barang dengan sistem</p>
            <p>Yarnen (Bayar Panen)</p>
            <p className="mt-2">Terima kasih atas kepercayaan Anda</p>
          </div>
        </div>

        {/* Actions - hidden when printing */}
        <div className="flex gap-2 p-4 border-t print:hidden">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Tutup
          </Button>
          <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Cetak Struk
          </Button>
        </div>
      </div>
    </div>
  )
}
