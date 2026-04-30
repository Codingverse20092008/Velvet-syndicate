import { create } from 'zustand'
import { apiFetch } from '@/lib/api'
import { enterpriseFetch, createOrderWithRetry } from '@/lib/api-enterprise'

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
      if (!options?.idempotencyKey) {
        throw new Error('Idempotency key is required for order creation')
      }

      const waitForOrderCompletion = async (trackingId: string) => {
        const maxAttempts = 45
        const delayMs = 1000

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const statusRes = await apiFetch(`/orders/status/${encodeURIComponent(trackingId)}`)
          const statusData = await statusRes.json()
          const statusPayload = statusData?.data ?? statusData

          if (!statusData.success) {
            if (statusRes.status === 404) {
              await new Promise((resolve) => setTimeout(resolve, delayMs))
              continue
            }
            const err: any = new Error(statusData.error || 'Failed to fetch order status')
            err.status = statusRes.status
            throw err
          }

          if (statusPayload.status === 'completed' && statusPayload.order?.id) {
            return statusPayload.order
          }

          if (statusPayload.status === 'failed') {
            const err: any = new Error(statusPayload.error || 'Order processing failed')
            err.status = 400
            throw err
          }

          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }

        throw new Error('Order is taking longer than expected. Please check your orders page.')
      }

      const response = await createOrderWithRetry(addressId, paymentMethod, {
        idempotencyKey: options.idempotencyKey,
        expectedVersion: options.expectedVersion,
      })
      
      const data = await response.json()
      const payload = data?.data ?? data
      
      if (data.success) {
        let order = payload.order
        const trackingId = order?.jobId || order?.intentId || order?.id || payload.jobId || payload.intentId

        if (!order?.id) {
          if (!trackingId) {
            throw new Error('Order accepted but tracking id is missing')
          }
          order = await waitForOrderCompletion(trackingId)
        }

        set({ isLoading: false })
        
        console.log('✅ ENTERPRISE ORDER CREATED', {
          orderId: order.id,
          total: order.totalAmount,
          status: order.status,
          alreadyExists: order.alreadyExists
        })
        
        return {
          id: order.id,
          total: Number(order.total ?? order.totalAmount ?? 0),
          status: order.status ?? 'CONFIRMED',
          paymentMethod: order.paymentMethod ?? 'COD',
          paymentStatus: order.paymentStatus ?? 'PENDING',
        }
      } else {
        const error = new Error(data.error || 'Failed to place order') as any
        error.status = response.status
        throw error
      }
    } catch (err: any) {
      console.error('❌ ENTERPRISE ORDER FAILED:', {
        error: err.message,
        status: err.status,
        stack: err.stack
      })
      
      set({ error: err.message, isLoading: false })
      throw err
    }
  },
}))
