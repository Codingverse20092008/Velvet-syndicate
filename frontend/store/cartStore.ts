import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiFetch } from '@/lib/api'
import { checkoutLock } from '@/lib/checkout-lock'


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
  checkoutInProgress: boolean // NEW: Prevent mutations during checkout
  // Loyalty points (10 points = ₹5)
  redeemedPoints: number
  discountAmount: number
  availablePoints: number
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
  setCheckoutInProgress: (inProgress: boolean) => void // NEW: Control checkout state
  // Loyalty points actions
  redeemPoints: (points: number) => void
  clearPointsRedemption: () => void
  setAvailablePoints: (points: number) => void
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
      checkoutInProgress: false, // NEW: Initialize checkout state
      // Loyalty points initial state
      redeemedPoints: 0,
      discountAmount: 0,
      availablePoints: 0,

      recalculate: () => {
        const items = get().items
        set({
          totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
          totalPrice: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
        })
      },

      syncCart: async () => {
        // 🛡️ GLOBAL SYNC LOCK CHECK (Synchronous)
        if (checkoutLock.isLocked()) {
          console.log('🚫 Cart sync blocked - global lock active')
          return
        }
        
        // 🛡️ STORE LOCK CHECK
        const { checkoutInProgress, isProcessing } = get()
        if (checkoutInProgress || isProcessing) {
          console.log('🚫 Cart sync blocked - state locked')
          return
        }
        
        const localItems = get().items
        if (localItems.length === 0) return
        
        try {
          set({ isProcessing: true })
          const res = await apiFetch('/cart')
          
          // 🛡️ RE-CHECK LOCK: State might have changed during the network call
          if (get().checkoutInProgress) {
            console.log('🚫 Cart sync aborted - checkout started during fetch')
            return
          }

          const data = await res.json()
          const payload = data?.data ?? data
          
          if (!data.success) {
            throw new Error('Failed to fetch backend cart for sync')
          }

          const backendItems = payload.cart?.items || []

          // 🔄 SMART SYNC - Only add missing items
          for (const item of localItems) {
            const exists = backendItems.find((bi: any) => 
              bi.productId === item.id && bi.variantId === item.variantId && bi.size === item.size
            )
            
            if (!exists) {
              console.log(`🛒 Syncing missing item to backend: ${item.name}`)
              await apiFetch('/cart', {
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
          }
          
          // Fetch final state from backend
          await get().fetchCart()
        } catch (error) {
          console.error('❌ Cart sync failed:', error)
        } finally {
          set({ isProcessing: false })
        }
      },

      fetchCart: async () => {
        // 🛡️ GLOBAL LOCK CHECK
        if (checkoutLock.isLocked() || get().checkoutInProgress) {
          console.log('🚫 Cart fetch blocked - checkout in progress')
          return
        }
        
        set({ isLoading: true })
        try {
          const res = await apiFetch('/cart')
          const data = await res.json()
          const payload = data?.data ?? data
          if (data.success) {
            const mappedItems = payload.cart?.items?.map((item: any) => ({
              id: item.productId,
              variantId: item.variantId,
              variantName: item.variant?.name !== 'Standard' ? item.variant?.name : undefined,
              name: item.product.name,
              slug: item.product.slug,
              price: item.product.price,
              image: item.variant?.images?.[0]?.imageUrl || item.product.imageUrl,
              size: item.size,
              quantity: item.quantity,
            })) || []
            set({ 
              items: mappedItems,
              version: payload.cart?.version || 0 
            })
            get().recalculate()
          }
        } catch (error) {
          console.error('Failed to fetch cart:', error)
        } finally {
          set({ isLoading: false })
        }
      },

      addItem: async (item) => {
        // 🚫 BLOCK MUTATIONS DURING CHECKOUT
        if (get().isProcessing || get().checkoutInProgress) {
          console.log('🚫 Add item blocked - cart processing or checkout in progress')
          return
        }
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
            await apiFetch('/cart', {
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
        // 🚫 BLOCK MUTATIONS DURING CHECKOUT
        if (get().isProcessing || get().checkoutInProgress) {
          console.log('🚫 Remove item blocked - cart processing or checkout in progress')
          return
        }
        set({ isProcessing: true })
        try {
          set((state) => ({
            items: state.items.filter((i) => !(i.id === productId && i.variantId === variantId && i.size === size)),
          }))
          get().recalculate()
          const { useAuthStore } = await import('@/store/authStore')
          if (useAuthStore.getState().isAuthenticated) {
            await apiFetch(`/cart?productId=${productId}&variantId=${variantId}&size=${size}`, { method: 'DELETE' })
          }
        } finally {
          set({ isProcessing: false })
        }
      },

      updateQuantity: async (productId, variantId, size, quantity) => {
        // 🚫 BLOCK MUTATIONS DURING CHECKOUT
        if (get().isProcessing || get().checkoutInProgress) {
          console.log('🚫 Update quantity blocked - cart processing or checkout in progress')
          return
        }
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
            await apiFetch('/cart', {
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
        console.log('🧹 CLEARING CART STORE')
        set({ 
          items: [], 
          totalItems: 0, 
          totalPrice: 0, 
          checkoutInProgress: false,
          version: get().version + 1,
          redeemedPoints: 0,
          discountAmount: 0,
        })
      },

      toggleCart: () => {
        set({ isOpen: !get().isOpen })
      },

      closeCart: () => {
        set({ isOpen: false })
      },

      setHasHydrated: (val: boolean) => {
        set({ hasHydrated: val })
      },

      setCheckoutInProgress: (inProgress: boolean) => {
        set({ checkoutInProgress: inProgress })
      },

      // Loyalty points: 10 points = ₹5 discount
      redeemPoints: (points: number) => {
        const { availablePoints, totalPrice } = get()
        const validPoints = Math.min(points, availablePoints)
        // 10 points = ₹5, so 1 point = ₹0.5
        const maxDiscount = totalPrice * 0.5 // Max 50% discount
        const discount = Math.min((validPoints / 10) * 5, maxDiscount)
        const actualPoints = Math.ceil((discount / 5) * 10)
        set({ 
          redeemedPoints: actualPoints,
          discountAmount: discount 
        })
      },

      clearPointsRedemption: () => {
        set({ redeemedPoints: 0, discountAmount: 0 })
      },

      setAvailablePoints: (points: number) => {
        set({ availablePoints: points })
      },
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
        state?.recalculate()
      }
    }
  )
)

