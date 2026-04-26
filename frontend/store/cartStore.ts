import { create } from 'zustand'
import { persist } from 'zustand/middleware'


export interface CartItem {
  id: string
  variantId: string
  variantName?: string
  name: string
  slug: string
  price: number
  image: string
  size: string
  quantity: number
}

interface CartState {
  items: CartItem[]
  isOpen: boolean
  isLoading: boolean
  isProcessing: boolean
  hasHydrated: boolean
  totalItems: number
  totalPrice: number
  version: number
  syncCart: () => Promise<void>
  fetchCart: () => Promise<void>
  addItem: (item: Omit<CartItem, 'quantity'>) => Promise<void>
  removeItem: (productId: string, variantId: string, size: string) => Promise<void>
  updateQuantity: (productId: string, variantId: string, size: string, quantity: number) => Promise<void>
  clearCart: () => void
  toggleCart: () => void
  closeCart: () => void
  recalculate: () => void
  setHasHydrated: (val: boolean) => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      isLoading: false,
      isProcessing: false,
      hasHydrated: false,
      totalItems: 0,
      totalPrice: 0,
      version: 0,

      recalculate: () => {
        const items = get().items
        set({
          totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
          totalPrice: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
        })
      },

      syncCart: async () => {
        const localItems = get().items
        if (localItems.length === 0) return
        try {
          for (const item of localItems) {
            await fetch('/api/cart', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productId: item.id,
                variantId: item.variantId,
                size: item.size,
                quantity: item.quantity,
              }),
            })
          }
          set((state) => ({ version: state.version + 1 }))
        } catch (error) {
          console.error('Failed to sync local cart:', error)
        }
      },

      fetchCart: async () => {
        set({ isLoading: true })
        try {
          const res = await fetch('/api/cart')
          const data = await res.json()
          if (data.success) {
            const mappedItems = data.data.cart.items.map((item: any) => ({
              id: item.productId,
              variantId: item.variantId,
              variantName: item.variant?.name !== 'Standard' ? item.variant?.name : undefined,
              name: item.product.name,
              slug: item.product.slug,
              price: item.product.price,
              image: item.variant?.images?.[0]?.imageUrl || item.product.imageUrl,
              size: item.size,
              quantity: item.quantity,
            }))
            set({ items: mappedItems })
            get().recalculate()
          }
        } catch (error) {
          console.error('Failed to fetch cart:', error)
        } finally {
          set({ isLoading: false })
        }
      },

      addItem: async (item) => {
        if (get().isProcessing) return
        set({ isProcessing: true })
        try {
          const items = get().items
          const idx = items.findIndex(i => i.id === item.id && i.variantId === item.variantId && i.size === item.size)
          let newItems
          if (idx > -1) {
            newItems = items.map((i, k) => k === idx ? { ...i, quantity: i.quantity + 1 } : i)
          } else {
            newItems = [...items, { ...item, quantity: 1 }]
          }
          set({ items: newItems })
          get().recalculate()

          const { useAuthStore } = await import('@/store/authStore')
          if (useAuthStore.getState().isAuthenticated) {
            await fetch('/api/cart', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...item, quantity: 1, productId: item.id }),
            })
          }
        } finally {
          set({ isProcessing: false })
        }
      },

      removeItem: async (productId, variantId, size) => {
        if (get().isProcessing) return
        set({ isProcessing: true })
        try {
          set((state) => ({
            items: state.items.filter((i) => !(i.id === productId && i.variantId === variantId && i.size === size)),
          }))
          get().recalculate()
          const { useAuthStore } = await import('@/store/authStore')
          if (useAuthStore.getState().isAuthenticated) {
            await fetch(`/api/cart?productId=${productId}&variantId=${variantId}&size=${size}`, { method: 'DELETE' })
          }
        } finally {
          set({ isProcessing: false })
        }
      },

      updateQuantity: async (productId, variantId, size, quantity) => {
        if (get().isProcessing) return
        set({ isProcessing: true })
        try {
          if (quantity <= 0) {
            set({ isProcessing: false })
            await get().removeItem(productId, variantId, size)
            return
          }
          set((state) => ({
            items: state.items.map((i) =>
              i.id === productId && i.variantId === variantId && i.size === size ? { ...i, quantity } : i
            ),
          }))
          get().recalculate()
          const { useAuthStore } = await import('@/store/authStore')
          if (useAuthStore.getState().isAuthenticated) {
            await fetch('/api/cart', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId, variantId, size, quantity }),
            })
          }
        } finally {
          set({ isProcessing: false })
        }
      },

      clearCart: () => {
        set({ items: [], totalItems: 0, totalPrice: 0 })
      },

      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      closeCart: () => set({ isOpen: false }),
      setHasHydrated: (val: boolean) => set({ hasHydrated: val }),
    }),
    {
      name: 'velvet-cart',
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
        state?.recalculate()
      }
    }
  )
)

