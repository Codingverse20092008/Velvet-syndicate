import { create } from 'zustand'
import { apiFetch } from '@/lib/api'

export interface Address {
  id: string
  name: string
  phone: string
  street: string
  city: string
  state: string
  pincode: string
  isDefault: boolean
}

interface AddressState {
  addresses: Address[]
  isLoading: boolean
  error: string | null
  fetchAddresses: () => Promise<void>
  addAddress: (address: Omit<Address, 'id' | 'isDefault'> & { isDefault?: boolean }) => Promise<void>
  updateAddress: (id: string, address: Partial<Address>) => Promise<void>
  deleteAddress: (id: string) => Promise<void>
  setDefault: (id: string) => Promise<void>
}

export const useAddressStore = create<AddressState>((set, get) => ({
  addresses: [],
  isLoading: false,
  error: null,

  fetchAddresses: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiFetch('/user/addresses')
      const data = await res.json()
      if (data.success) {
        set({ addresses: data.addresses, isLoading: false })
      } else {
        throw new Error(data.error || 'Failed to fetch addresses')
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  addAddress: async (addressData) => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiFetch('/user/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressData),
      })
      const data = await res.json()
      if (data.success) {
        await get().fetchAddresses()
      } else {
        throw new Error(data.error || 'Failed to add address')
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
      throw err
    }
  },

  updateAddress: async (id, addressData) => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiFetch(`/user/addresses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressData),
      })
      const data = await res.json()
      if (data.success) {
        await get().fetchAddresses()
      } else {
        throw new Error(data.error || 'Failed to update address')
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
      throw err
    }
  },

  deleteAddress: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiFetch(`/user/addresses/${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        await get().fetchAddresses()
      } else {
        throw new Error(data.error || 'Failed to delete address')
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
      throw err
    }
  },

  setDefault: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const res = await apiFetch(`/user/addresses/${id}/default`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.success) {
        await get().fetchAddresses()
      } else {
        throw new Error(data.error || 'Failed to set default address')
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
      throw err
    }
  },
}))
