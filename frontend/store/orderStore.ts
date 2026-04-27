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
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'FAILED'
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  paymentMethod: string
  shippingAddress: string // JSON snapshot
  createdAt: string
  items: OrderItem[]
}

interface OrderState {
  orders: Order[]
  currentOrder: Order | null
  isLoading: boolean
  error: string | null
  fetchOrders: () => Promise<void>
  fetchOrderById: (id: string) => Promise<void>
  createOrder: (addressId: string, paymentMethod?: string) => Promise<string>
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
      if (data.success) {
        set({ orders: data.orders, isLoading: false })
      } else {
        throw new Error(data.error || 'Failed to fetch orders')
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  fetchOrderById: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiFetch(`/orders/${id}`)
      const data = await res.json()
      if (data.success) {
        set({ currentOrder: data.order, isLoading: false })
      } else {
        throw new Error(data.error || 'Failed to fetch order details')
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  createOrder: async (addressId, paymentMethod = 'COD') => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiFetch('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addressId, paymentMethod }),
      })
      const data = await res.json()
      if (data.success) {
        set({ isLoading: false })
        return data.order.id
      } else {
        throw new Error(data.error || 'Failed to place order')
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
      throw err
    }
  },
}))
