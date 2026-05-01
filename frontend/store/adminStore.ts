'use client'

import { create } from 'zustand'
import { apiFetch } from '@/lib/api'

export type AdminOrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'FAILED'

export interface AdminAddressSnapshot {
  name?: string
  phone?: string
  street?: string
  city?: string
  state?: string
  pincode?: string
}

export interface AdminOrderItem {
  id: string
  userId: string
  customerName: string
  phone: string
  addressSnapshot: AdminAddressSnapshot
  total: number
  paymentMethod: string
  paymentStatus: string
  status: AdminOrderStatus
  createdAt: string
  itemsSummary?: string
}

export interface AdminOrderDetail extends AdminOrderItem {
  items: Array<{
    id: string
    productId: string
    productName: string
    productPrice: number
    quantity: number
    size: string
    variantId: string | null
    imageUrl: string | null
  }>
}

export interface AdminProduct {
  id: string
  name: string
  slug: string
  description: string
  price: number
  image: string
  brand: string
  stock: number
  isVisible: boolean
  createdAt: string
  color?: string
  sizes?: string
  gender?: string
  subcategory?: string
}

export interface AdminUser {
  id: string
  name: string
  email: string
  phone: string | null
  totalOrders: number
  createdAt: string
}

export interface AdminStats {
  totalOrders: number
  totalRevenue: number
  pendingOrders: number
  ordersToday: number
  revenueToday: number
  recentOrders: AdminOrderItem[]
}

export interface DashboardMetrics {
  totalUsers: number
  newUsersToday: number
  totalProfit: number
  profitToday: number
  profitMargin: number
  avgOrderValue: number
  conversionRate: number
  salesGrowth: number
  totalLoyaltyPoints: number
  pointsRedeemed: number
  topProducts: Array<{
    id: string
    name: string
    totalSold: number
    revenue: number
  }>
  salesByDay: Array<{
    date: string
    sales: number
    orders: number
  }>
  ordersByStatus: Record<AdminOrderStatus, number>
}

interface AdminState {
  orders: AdminOrderItem[]
  currentOrder: AdminOrderDetail | null
  products: AdminProduct[]
  users: AdminUser[]
  stats: AdminStats | null
  dashboardMetrics: DashboardMetrics | null
  isLoading: boolean
  error: string | null
  fetchOverview: () => Promise<void>
  fetchDashboardMetrics: () => Promise<void>
  fetchOrders: () => Promise<void>
  fetchOrderById: (orderId: string) => Promise<void>
  updateOrderStatus: (orderId: string, status: AdminOrderStatus) => Promise<void>
  fetchProducts: () => Promise<void>
  createProduct: (payload: Omit<AdminProduct, 'id' | 'slug' | 'createdAt' | 'isVisible'>) => Promise<void>
  updateProduct: (productId: string, payload: Partial<Omit<AdminProduct, 'id' | 'slug' | 'createdAt'>>) => Promise<void>
  deleteProduct: (productId: string) => Promise<void>
  toggleStock: (productId: string, inStock: boolean) => Promise<void>
  fetchUsers: () => Promise<void>
}

function getPayload(data: any) {
  return data?.data ?? data
}

export const useAdminStore = create<AdminState>((set, get) => ({
  orders: [],
  currentOrder: null,
  products: [],
  users: [],
  stats: null,
  dashboardMetrics: null,
  isLoading: false,
  error: null,

  fetchOverview: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiFetch('/admin/overview')
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to load dashboard')
      const payload = getPayload(data)
      set({ stats: payload.overview, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  fetchDashboardMetrics: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiFetch('/admin/metrics')
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to load metrics')
      const payload = getPayload(data)
      set({ dashboardMetrics: payload.metrics, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  fetchOrders: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiFetch('/admin/orders')
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to load orders')
      const payload = getPayload(data)
      set({ orders: payload.orders ?? [], isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  fetchOrderById: async (orderId: string) => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiFetch(`/admin/orders/${orderId}`)
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to load order')
      const payload = getPayload(data)
      set({ currentOrder: payload.order ?? null, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  updateOrderStatus: async (orderId, status) => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiFetch(`/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to update order status')

      const payload = getPayload(data)
      const updatedOrder = payload.order as AdminOrderDetail

      set((state) => ({
        orders: state.orders.map((order) =>
          order.id === updatedOrder.id ? { ...order, status: updatedOrder.status } : order
        ),
        currentOrder: state.currentOrder?.id === updatedOrder.id ? updatedOrder : state.currentOrder,
        isLoading: false,
      }))
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
      throw err
    }
  },

  fetchProducts: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiFetch('/admin/products')
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to load products')
      const payload = getPayload(data)
      set({ products: payload.products ?? [], isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  createProduct: async (payload) => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiFetch('/admin/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to create product')
      await get().fetchProducts()
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
      throw err
    }
  },

  updateProduct: async (productId, payload) => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiFetch(`/admin/products/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to update product')
      await get().fetchProducts()
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
      throw err
    }
  },

  deleteProduct: async (productId) => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiFetch(`/admin/products/${productId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to delete product')
      set((state) => ({
        products: state.products.map((product) =>
          product.id === productId
            ? { ...product, isVisible: false }
            : product
        ),
        isLoading: false,
      }))
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
      throw err
    }
  },

  toggleStock: async (productId, inStock) => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiFetch(`/admin/products/${productId}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({ inStock }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to toggle stock')
      await get().fetchProducts()
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
      throw err
    }
  },

  fetchUsers: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiFetch('/admin/users')
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to load users')
      const payload = getPayload(data)
      set({ users: payload.users ?? [], isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },
}))
