'use client'

import { ShoppingBag } from 'lucide-react'
import { Order } from '@/store/orderStore'
import { formatPrice } from '@/lib/utils'

export function OrderItemsTable({ items }: { items: Order['items'] }) {
  return (
    <div className="space-y-4">
      <div className="hidden md:grid grid-cols-4 gap-4 pb-4 border-b border-white/5 text-[10px] uppercase tracking-widest font-bold text-velvet-muted">
        <div className="col-span-2">Product</div>
        <div className="text-center">Quantity</div>
        <div className="text-right">Price</div>
      </div>

      {items.map((item) => (
        <div key={item.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 py-4 border-b border-white/5 items-center">
          <div className="col-span-2 flex items-center gap-4">
            <div className="w-16 h-20 rounded-lg overflow-hidden bg-white/5 border border-white/10">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag size={20} className="text-velvet-muted" />
                </div>
              )}
            </div>
            <div>
              <h4 className="text-sm font-heading text-velvet-white tracking-wide mb-1">{item.productName}</h4>
              <p className="text-xs text-velvet-muted uppercase tracking-widest">Size: {item.size}</p>
            </div>
          </div>
          <div className="flex md:block items-center justify-between">
            <span className="md:hidden text-xs text-velvet-muted uppercase tracking-widest">Quantity</span>
            <div className="text-sm text-velvet-white text-center">x{item.quantity}</div>
          </div>
          <div className="flex md:block items-center justify-between">
            <span className="md:hidden text-xs text-velvet-muted uppercase tracking-widest">Price</span>
            <div className="text-sm font-medium text-velvet-white text-right">{formatPrice(item.productPrice)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
