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
  totalItems: number
  totalPrice: number
  fetchCart: () => Promise<void>
  addItem: (item: Omit<CartItem, 'quantity'>) => Promise<void>
  removeItem: (productId: string, variantId: string, size: string) => Promise<void>
  updateQuantity: (productId: string, variantId: string, size: string, quantity: number) => Promise<void>
  clearCart: () => void
  toggleCart: () => void
  closeCart: () => void
  recalculate: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      isLoading: false,
      totalItems: 0,
      totalPrice: 0,

      fetchCart: async () => {
        set({ isLoading: true })
        try {
          const res = await fetch('/api/cart')
          const data = await res.json()
          if (data.success) {
            const mappedItems = data.data.items.map((item: any) => ({
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
        // Optimistic update
        const existingItemIndex = get().items.findIndex(
          (i) => i.id === item.id && i.variantId === item.variantId && i.size === item.size
        )

        let newItems
        if (existingItemIndex > -1) {
          newItems = get().items.map((i, idx) =>
            idx === existingItemIndex ? { ...i, quantity: i.quantity + 1 } : i
          )
        } else {
          newItems = [...get().items, { ...item, quantity: 1 }]
        }

        set({ items: newItems })
        get().recalculate()

        try {
          await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: item.id,
              variantId: item.variantId,
              size: item.size,
              quantity: 1,
            }),
          })
        } catch (error) {
          console.error('Failed to sync add item:', error)
        }
      },

      removeItem: async (productId, variantId, size) => {
        set((state) => ({
          items: state.items.filter((i) => !(i.id === productId && i.variantId === variantId && i.size === size)),
        }))
        get().recalculate()

        try {
          await fetch(`/api/cart?productId=${productId}&variantId=${variantId}&size=${size}`, {
            method: 'DELETE',
          })
        } catch (error) {
          console.error('Failed to sync remove item:', error)
        }
      },

      updateQuantity: async (productId, variantId, size, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId, size)
          return
        }

        set((state) => ({
          items: state.items.map((i) =>
            i.id === productId && i.variantId === variantId && i.size === size ? { ...i, quantity } : i
          ),
        }))
        get().recalculate()

        try {
          await fetch('/api/cart', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, variantId, size, quantity }),
          })
        } catch (error) {
          console.error('Failed to sync update quantity:', error)
        }
      },

      clearCart: () => {
        set({ items: [] })
        get().recalculate()
      },

      toggleCart: () => {
        set((state) => ({ isOpen: !state.isOpen }))
      },

      closeCart: () => {
        set({ isOpen: false })
      },

      recalculate: () => {
        set((state) => ({
          totalItems: state.items.reduce((sum, item) => sum + item.quantity, 0),
          totalPrice: state.items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          ),
        }))
      },
    }),
    {
      name: 'velvet-cart',
      partialize: (state) => ({ items: state.items }), // Only persist items
    }
  )
)

