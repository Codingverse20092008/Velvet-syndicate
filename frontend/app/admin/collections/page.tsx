'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Upload, X, Layers, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface Collection {
  id: string
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  isVisible: boolean
  productCount: number
  createdAt: string
}

interface Product {
  id: string
  name: string
}

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    imageUrl: '',
    productIds: [] as string[]
  })

  useEffect(() => {
    fetchCollections()
    fetchProducts()
  }, [])

  const fetchCollections = async () => {
    setIsLoading(true)
    try {
      const res = await apiFetch('/admin/collections')
      const data = await res.json()
      if (data.success) {
        setCollections(data.data.collections)
      } else {
        setError(data.error || 'Failed to fetch collections')
      }
    } catch (err) {
      setError('Connection error')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await apiFetch('/admin/products')
      const data = await res.json()
      if (data.success) {
        setProducts(data.data.products)
      }
    } catch (err) {
      console.error('Failed to fetch products for selection')
    }
  }

  const handleCreateOrUpdate = async () => {
    setIsActionLoading(true)
    setError(null)
    try {
      const method = editingId ? 'PATCH' : 'POST'
      const url = editingId ? `/admin/collections/${editingId}` : '/admin/collections'
      
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(formData)
      })
      
      const data = await res.json()
      if (data.success) {
        setIsFormOpen(false)
        setEditingId(null)
        setFormData({ name: '', slug: '', description: '', imageUrl: '', productIds: [] })
        fetchCollections()
      } else {
        setError(data.error || 'Operation failed')
      }
    } catch (err) {
      setError('Connection error')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this collection?')) return
    
    setIsActionLoading(true)
    try {
      const res = await apiFetch(`/admin/collections/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        fetchCollections()
      } else {
        setError(data.error || 'Delete failed')
      }
    } catch (err) {
      setError('Connection error')
    } finally {
      setIsActionLoading(false)
    }
  }

  const startEdit = (c: Collection) => {
    setEditingId(c.id)
    setFormData({
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      imageUrl: c.imageUrl || '',
      productIds: [] // We'd need to fetch these if we wanted to pre-fill
    })
    setIsFormOpen(true)
  }

  const handleImageUpload = async (file: File) => {
    setIsActionLoading(true)
    try {
      const body = new FormData()
      body.append('image', file)
      
      const res = await apiFetch('/admin/upload', {
        method: 'POST',
        body
      })
      
      const data = await res.json()
      if (data.success && data.data.imageUrl) {
        setFormData(prev => ({ ...prev, imageUrl: data.data.imageUrl }))
      }
    } catch (err) {
      setError('Image upload failed')
    } finally {
      setIsActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl text-velvet-white tracking-wider uppercase">Collection Management</h1>
          <p className="text-velvet-muted text-sm mt-2">Curate product groupings for the store.</p>
        </div>
        <Button onClick={() => { setEditingId(null); setIsFormOpen(true); }} className="flex items-center gap-2">
          <Plus size={16} />
          Create New
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {isFormOpen && (
        <div className="bg-velvet-card border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="font-heading text-xl text-velvet-white">{editingId ? 'Edit' : 'New'} Collection</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              className="bg-black border border-white/15 rounded-xl px-4 py-3 text-sm text-velvet-white" 
              placeholder="Collection Name" 
              value={formData.name}
              onChange={(e) => {
                const name = e.target.value;
                const slug = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                setFormData(prev => ({ ...prev, name, slug }));
              }}
            />
            <input 
              className="bg-black border border-white/15 rounded-xl px-4 py-3 text-sm text-velvet-white" 
              placeholder="Slug (url identifier)" 
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
            />
            <textarea 
              className="md:col-span-2 bg-black border border-white/15 rounded-xl px-4 py-3 text-sm text-velvet-white min-h-[100px]" 
              placeholder="Description" 
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
            
            <div className="md:col-span-2">
              <label className="flex items-center gap-3 px-4 py-3 bg-black border border-white/15 rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
                <Upload size={16} className="text-velvet-accent" />
                <span className="text-sm text-velvet-white">Upload Cover Image</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }} />
              </label>
              {formData.imageUrl && (
                <div className="mt-2 text-xs text-velvet-muted">Image selected: {formData.imageUrl}</div>
              )}
            </div>

            <div className="md:col-span-2">
              <div className="text-xs text-velvet-muted mb-2 uppercase tracking-widest">Select Products</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border border-white/10 rounded-xl bg-black/30">
                {products.map(p => (
                  <label key={p.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.productIds.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({ ...prev, productIds: [...prev.productIds, p.id] }));
                        } else {
                          setFormData(prev => ({ ...prev, productIds: prev.productIds.filter(id => id !== p.id) }));
                        }
                      }}
                      className="accent-velvet-accent"
                    />
                    <span className="text-xs text-velvet-white truncate">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleCreateOrUpdate} isLoading={isActionLoading}>
              {editingId ? 'Save Changes' : 'Create Collection'}
            </Button>
            <Button variant="secondary" onClick={() => setIsFormOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="bg-velvet-card border border-white/10 rounded-2xl overflow-hidden">
        <div className="hidden sm:grid grid-cols-12 px-5 py-4 text-[10px] uppercase tracking-widest text-velvet-muted border-b border-white/5">
          <div className="col-span-5">Collection</div>
          <div className="col-span-2">Products</div>
          <div className="col-span-2">Created</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>
        <div className="divide-y divide-white/5">
          {isLoading ? (
            <div className="px-6 py-12 text-center text-velvet-muted">
              <Loader2 size={24} className="animate-spin mx-auto mb-2 text-velvet-accent" />
              Loading collections...
            </div>
          ) : collections.length === 0 ? (
            <div className="px-6 py-12 text-center text-velvet-muted">No collections found.</div>
          ) : collections.map(c => (
            <div key={c.id} className="flex flex-col sm:grid sm:grid-cols-12 px-5 py-4 items-start sm:items-center gap-4 sm:gap-0">
              <div className="col-span-5 w-full">
                <div className="text-velvet-white font-medium">{c.name}</div>
                <div className="text-[10px] text-velvet-muted mt-1 uppercase tracking-tight">/{c.slug}</div>
              </div>
              <div className="col-span-2 flex items-center gap-2 sm:block">
                <span className="sm:hidden text-[10px] uppercase text-velvet-muted">Products:</span>
                <span className="text-velvet-white text-sm sm:text-base">{c.productCount}</span>
              </div>
              <div className="col-span-2 flex items-center gap-2 sm:block">
                <span className="sm:hidden text-[10px] uppercase text-velvet-muted">Created:</span>
                <span className="text-velvet-muted text-[10px]">{new Date(c.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="col-span-3 w-full flex justify-start sm:justify-end gap-2 border-t border-white/5 sm:border-0 pt-3 sm:pt-0">
                <button onClick={() => startEdit(c)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-velvet-muted hover:text-velvet-white transition-colors text-xs">
                  <Pencil size={14} />
                  <span>Edit</span>
                </button>
                <button onClick={() => handleDelete(c.id)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400/60 hover:text-red-400 transition-colors text-xs">
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
