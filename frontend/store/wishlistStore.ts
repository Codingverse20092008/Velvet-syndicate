import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'

export interface WishlistItem {
  id: string
  userId: string
  productId: string
  createdAt: string
  name: string
  slug: string
  price: number
  image_url: string
  is_on_sale: number | boolean
  sale_price: number | null
  sale_percentage: number
  is_out_of_stock: number | boolean
}

interface WishlistState {
  items: WishlistItem[]
  ids: string[]
  count: number
  isLoading: boolean

  fetchWishlist: () => Promise<void>
  addToWishlist: (productId: string) => Promise<{ success: boolean; message: string }>
  removeFromWishlist: (productId: string) => Promise<void>
  isWishlisted: (productId: string) => boolean
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      ids: [],
      count: 0,
      isLoading: false,

      fetchWishlist: async () => {
        set({ isLoading: true })
        try {
          const res = await api.get('/wishlist')
          const data = await res.json()
          if (data.success && data.data) {
            const items: WishlistItem[] = data.data.items || []
            set({
              items,
              ids: items.map(i => i.productId),
              count: data.data.count || items.length,
              isLoading: false,
            })
          }
        } catch {
          // Silent fail — user may not be authenticated
        } finally {
          set({ isLoading: false })
        }
      },

      addToWishlist: async (productId: string) => {
        const currentIds = get().ids
        if (currentIds.includes(productId)) {
          return { success: true, message: 'Already In Wishlist' }
        }

        // Optimistic update
        set({ ids: [...currentIds, productId], count: get().count + 1 })

        try {
          const res = await api.post('/wishlist/add', { productId })
          const data = await res.json()
          if (data.success) {
            get().fetchWishlist()
            // Track for Velvet Vault challenge
            const { useGameStore } = await import('@/store/gameStore')
            useGameStore.getState().trackWishlistAdd(productId)
            return { success: true, message: data.data?.message || 'Added To Wishlist' }
          }
          // Revert on failure
          set({ ids: currentIds, count: get().count - 1 })
          return { success: false, message: data.error || 'Failed to add' }
        } catch {
          set({ ids: currentIds, count: get().count - 1 })
          return { success: false, message: 'Failed to add' }
        }
      },

      removeFromWishlist: async (productId: string) => {
        const currentIds = get().ids
        const currentItems = get().items

        // Optimistic removal
        set({
          ids: currentIds.filter(id => id !== productId),
          items: currentItems.filter(i => i.productId !== productId),
          count: Math.max(0, get().count - 1),
        })

        try {
          await api.delete(`/wishlist/remove?productId=${encodeURIComponent(productId)}`)
        } catch {
          // Revert on error
          set({ ids: currentIds, items: currentItems, count: currentIds.length })
        }
      },

      isWishlisted: (productId: string) => {
        return get().ids.includes(productId)
      },
    }),
    {
      name: 'velvet_wishlist',
      partialize: (state) => ({ ids: state.ids, count: state.count }),
    }
  )
)
