import { create } from 'zustand'
import { apiFetch } from '@/lib/api'

export interface OrderItem {
  id: string
  productId: string
  productName: string
  productPrice: number
  quantity: number
  size: string
  imageUrl?: string
}

export interface Order {
  id: string
  totalAmount: number
  total?: number
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'FAILED'
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  paymentMethod: string
  shippingAddress: string // JSON snapshot
  addressSnapshot?: {
    name?: string
    phone?: string
    street?: string
    city?: string
    state?: string
    pincode?: string
  }
  createdAt: string
  items: OrderItem[]
}

interface OrderState {
  orders: Order[]
  currentOrder: Order | null
  isLoading: boolean
  error: string | null
  fetchOrders: () => Promise<void>
  fetchOrderById: (id: string, options?: { background?: boolean }) => Promise<void>
  createOrder: (
    addressId: string,
    paymentMethod?: string,
    options?: { idempotencyKey?: string; expectedVersion?: number }
  ) => Promise<{ id: string; total: number; status: Order['status']; paymentMethod: string; paymentStatus: Order['paymentStatus'] }>
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  currentOrder: null,
  isLoading: false,
  error: null,

  fetchOrders: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiFetch('/orders')
      const data = await res.json()
      const payload = data?.data ?? data
      if (data.success) {
        set({ orders: payload.orders ?? [], isLoading: false })
      } else {
        throw new Error(data.error || 'Failed to fetch orders')
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  fetchOrderById: async (id, options) => {
    if (!options?.background) {
      set({ isLoading: true, error: null })
    } else {
      set({ error: null })
    }
    try {
      const res = await apiFetch(`/orders/${id}`)
      const data = await res.json()
      const payload = data?.data ?? data
      if (data.success) {
        set({ currentOrder: payload.order ?? null, isLoading: false })
      } else {
        throw new Error(data.error || 'Failed to fetch order details')
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  createOrder: async (addressId, paymentMethod = 'COD', options) => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiFetch('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addressId,
          paymentMethod,
          idempotencyKey: options?.idempotencyKey,
          expectedVersion: options?.expectedVersion,
        }),
      })
      const data = await res.json()
      const payload = data?.data ?? data
      if (data.success) {
        set({ isLoading: false })
        const order = payload.order
        if (!order?.id) {
          throw new Error('Order created but response is invalid')
        }
        return {
          id: order.id,
          total: Number(order.total ?? 0),
          status: order.status ?? 'CONFIRMED',
          paymentMethod: order.paymentMethod ?? 'COD',
          paymentStatus: order.paymentStatus ?? 'PENDING',
        }
      } else {
        throw new Error(data.error || 'Failed to place order')
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
      throw err
    }
  },
}))
