'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAdminStore, AdminProduct } from '@/store/adminStore'
import { formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { apiFetch, getFullImageUrl } from '@/lib/api'

export type SizeInventory = {
  size: string
  stock: number
}

type ProductForm = {
  name: string
  price: string
  image: string
  images: string[]
  description: string
  stock: string
  brand: string
  color: string
  sizes: string
  sizeInventories: SizeInventory[]
  gender: 'men' | 'women' | 'unisex' | ''
  subcategory: 'casual' | 'walking' | 'jogging' | 'running' | 'sports' | 'sneakers' | 'streetwear' | ''
  featured: boolean
  isOutOfStock: boolean
  isOnSale: boolean
  salePercentage: string
  salePrice: string
  summerSale: boolean
  isNew: boolean
  isExclusive: boolean
  hasXPBonus: boolean
}

const emptyForm: ProductForm = {
  name: '',
  price: '',
  image: '',
  images: [],
  description: '',
  stock: '0',
  brand: '',
  color: '',
  sizes: '7,8,9,10,11',
  sizeInventories: [
    { size: '7', stock: 5 },
    { size: '8', stock: 5 },
    { size: '9', stock: 5 },
    { size: '10', stock: 5 },
    { size: '11', stock: 5 },
  ],
  gender: '',
  subcategory: '',
  featured: false,
  isOutOfStock: false,
  isOnSale: false,
  salePercentage: '',
  salePrice: '',
  summerSale: false,
  isNew: false,
  isExclusive: false,
  hasXPBonus: false,
}

const GENDERS = ['men', 'women', 'unisex'] as const
const SUBCATEGORIES = ['casual', 'walking', 'jogging', 'running', 'sports', 'sneakers', 'streetwear'] as const

export default function AdminProductsPage() {
  const {
    products,
    isLoading,
    error,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    hardDeleteProduct,
    toggleStock,
  } = useAdminStore()
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [customSizeInput, setCustomSizeInput] = useState('')

  const toggleSize = (size: string) => {
    setForm((prev) => {
      const exists = prev.sizeInventories.some((s) => s.size === size)
      const nextInventories = exists
        ? prev.sizeInventories.filter((s) => s.size !== size)
        : [...prev.sizeInventories, { size, stock: 5 }]
      const sum = nextInventories.reduce((acc, curr) => acc + (Number(curr.stock) || 0), 0)
      return {
        ...prev,
        sizeInventories: nextInventories,
        sizes: nextInventories.map((s) => s.size).join(','),
        stock: String(sum),
      }
    })
  }

  const updateSizeStock = (size: string, stockVal: number) => {
    setForm((prev) => {
      const nextInventories = prev.sizeInventories.map((s) =>
        s.size === size ? { ...s, stock: Math.max(0, stockVal) } : s
      )
      const sum = nextInventories.reduce((acc, curr) => acc + (Number(curr.stock) || 0), 0)
      return {
        ...prev,
        sizeInventories: nextInventories,
        stock: String(sum),
      }
    })
  }

  const quickFillAllStock = (amount: number) => {
    setForm((prev) => {
      const nextInventories = prev.sizeInventories.map((s) => ({ ...s, stock: amount }))
      const sum = nextInventories.length * amount
      return {
        ...prev,
        sizeInventories: nextInventories,
        stock: String(sum),
      }
    })
  }

  const addCustomSize = () => {
    const trimmed = customSizeInput.trim()
    if (!trimmed) return
    setForm((prev) => {
      if (prev.sizeInventories.some((s) => s.size.toLowerCase() === trimmed.toLowerCase())) {
        return prev
      }
      const nextInventories = [...prev.sizeInventories, { size: trimmed, stock: 5 }]
      const sum = nextInventories.reduce((acc, curr) => acc + (Number(curr.stock) || 0), 0)
      return {
        ...prev,
        sizeInventories: nextInventories,
        sizes: nextInventories.map((s) => s.size).join(','),
        stock: String(sum),
      }
    })
    setCustomSizeInput('')
  }

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const title = useMemo(() => (editingProduct ? 'Edit Product' : 'Add Product'), [editingProduct])


  const handleImageUpload = async (file: File) => {
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      
      const res = await apiFetch('/admin/upload', {
        method: 'POST',
        body: formData,
      })
      
      const data = await res.json()
      // Backend wraps response in data.data property
      const responseData = data.data || data
      if (data.success && responseData.imageUrl) {
        const fullImageUrl = getFullImageUrl(responseData.imageUrl)
        setForm((prev) => ({ ...prev, image: fullImageUrl }))
        setImagePreview(fullImageUrl)
      } else {
        console.error('Upload failed - response:', data)
        throw new Error(data.error || `Upload failed - ${!data.success ? 'success=false' : 'no imageUrl'}`)
      }
    } catch (err) {
      console.error('Image upload failed:', err)
      alert('Failed to upload image. Please try again.')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleMultipleImageUpload = async (files: FileList) => {
    if (form.images.length + files.length > 4) {
      alert('Maximum 4 images allowed')
      return
    }
    
    setUploadingImage(true)
    try {
      const formData = new FormData()
      Array.from(files).forEach(file => formData.append('images', file))
      
      const res = await apiFetch('/admin/upload/multiple', {
        method: 'POST',
        body: formData,
      })
      
      const data = await res.json()
      // Backend wraps response in data.data property
      const responseData = data.data || data
      if (data.success && responseData.imageUrls && Array.isArray(responseData.imageUrls)) {
        const fullImageUrls = responseData.imageUrls.map((url: string) => getFullImageUrl(url)).filter(Boolean)
        setForm((prev) => ({ ...prev, images: [...prev.images, ...fullImageUrls] }))
        setImagePreviews(prev => [...prev, ...fullImageUrls])
      } else {
        console.error('Multiple upload failed - response:', data)
        throw new Error(data.error || 'Upload failed - no image URLs returned')
      }
    } catch (err) {
      console.error('Multiple image upload failed:', err)
      alert('Failed to upload images. Please try again.')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file)
    }
  }

  const handleMultipleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleMultipleImageUpload(files)
    }
  }

  const clearImage = () => {
    setForm((prev) => ({ ...prev, image: '' }))
    setImagePreview(null)
  }

  const removeImage = (index: number) => {
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const submit = async () => {
    const calculatedTotalStock = form.sizeInventories.length > 0
      ? form.sizeInventories.reduce((acc, curr) => acc + (Number(curr.stock) || 0), 0)
      : Number(form.stock || 0)

    const payload = {
      name: form.name.trim(),
      price: Number(form.price),
      image: form.image.trim() || (form.images[0] || ''),
      images: form.images,
      description: form.description.trim(),
      stock: calculatedTotalStock,
      brand: form.brand.trim(),
      color: form.color.trim(),
      sizes: form.sizeInventories.length > 0 ? form.sizeInventories.map(s => s.size).join(',') : form.sizes.trim(),
      sizesWithStock: form.sizeInventories.map(s => ({ size: s.size, stock: Math.max(0, Number(s.stock) || 0) })),
      gender: form.gender || 'unisex',
      subcategory: form.subcategory || 'sneakers',
      featured: form.featured,
      isOutOfStock: form.isOutOfStock || calculatedTotalStock === 0,
      isOnSale: form.isOnSale,
      summerSale: form.summerSale,
      salePercentage: Number(form.salePercentage || 0),
      salePrice: form.isOnSale && form.salePrice ? Number(form.salePrice) : undefined,
      isNew: form.isNew,
      isExclusive: form.isExclusive,
      hasXPBonus: form.hasXPBonus,
    }

    if (editingProduct) {
      await updateProduct(editingProduct.id, payload)
      setEditingProduct(null)
    } else {
      await createProduct(payload)
    }
    setForm(emptyForm)
    setImagePreview(null)
    setImagePreviews([])
  }

  const startEdit = (product: AdminProduct) => {
    setEditingProduct(product)

    let sizeInvs: SizeInventory[] = []
    if (product.sizesWithStock && product.sizesWithStock.length > 0) {
      sizeInvs = product.sizesWithStock.map(s => ({ size: s.size, stock: Number(s.stock) || 0 }))
    } else if (product.sizes) {
      const splitSizes = product.sizes.split(',').map(s => s.trim()).filter(Boolean)
      const perSize = splitSizes.length > 0 ? Math.floor(product.stock / splitSizes.length) : 0
      const remainder = splitSizes.length > 0 ? product.stock % splitSizes.length : 0
      sizeInvs = splitSizes.map((sz, i) => ({
        size: sz,
        stock: perSize + (i < remainder ? 1 : 0)
      }))
    }

    const totalStockVal = sizeInvs.length > 0
      ? sizeInvs.reduce((acc, curr) => acc + curr.stock, 0)
      : product.stock

    setForm({
      name: product.name,
      price: String(product.price),
      image: product.image,
      images: [],
      description: product.description,
      stock: String(totalStockVal),
      brand: product.brand,
      color: product.color || '',
      sizes: sizeInvs.map(s => s.size).join(','),
      sizeInventories: sizeInvs,
      gender: (product.gender as any) || '',
      subcategory: (product.subcategory as any) || '',
      featured: product.featured || false,
      isOutOfStock: product.isOutOfStock || totalStockVal === 0,
      isOnSale: product.isOnSale || false,
      salePercentage: String(product.salePercentage || ''),
      salePrice: product.salePrice ? String(product.salePrice) : '',
      summerSale: product.summerSale || false,
      isNew: product.isNew || false,
      isExclusive: product.isExclusive || false,
      hasXPBonus: product.hasXPBonus || false,
    })
    setImagePreview(product.image)
    setImagePreviews([])
  }

  const handleDeactivate = async (product: AdminProduct) => {
    if (!product.isVisible) return

    const confirmed = window.confirm('Are you sure you want to deactivate this product? It will no longer be visible to customers, but historical orders will be preserved.')
    if (!confirmed) return
    await deleteProduct(product.id)
  }

  const handleHardDelete = async (product: AdminProduct) => {
    const confirmed = window.confirm('WARNING: Are you sure you want to PERMANENTLY delete this product? This action cannot be undone. If this product has existing orders, the deletion will fail.')
    if (!confirmed) return
    try {
      await hardDeleteProduct(product.id)
      alert('Product permanently deleted.')
    } catch (err: any) {
      alert(err.message || 'Failed to delete product.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-velvet-white tracking-wider uppercase">Product Management</h1>
        <p className="text-velvet-muted text-sm mt-2">Add, edit, and deactivate products while preserving historical order references.</p>
      </div>

      {error && <div className="p-4 border border-red-400/20 bg-red-500/10 rounded-xl text-red-300 text-sm">{error}</div>}

      <div className="bg-velvet-card border border-white/10 rounded-2xl p-6">
        <h2 className="font-heading text-xl text-velvet-white mb-4">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="bg-black border border-white/15 rounded-xl px-4 py-3 text-sm text-velvet-white" placeholder="Name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
          <input className="bg-black border border-white/15 rounded-xl px-4 py-3 text-sm text-velvet-white" placeholder="Brand" value={form.brand} onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))} />
          <input className="bg-black border border-white/15 rounded-xl px-4 py-3 text-sm text-velvet-white" placeholder="Price" type="number" min="0" value={form.price} onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))} />
          <input className="bg-black border border-white/15 rounded-xl px-4 py-3 text-sm text-velvet-white" placeholder="Color (e.g., Red, Blue, Black)" value={form.color} onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))} />
          <div className="bg-black/80 border border-white/15 rounded-xl px-4 py-2.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-velvet-muted block">Total Inventory Stock</span>
              <span className="text-xs text-velvet-muted">Sum of all size inventories</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-heading text-[#C9A961] font-bold">
                {form.sizeInventories.reduce((acc, curr) => acc + (Number(curr.stock) || 0), 0)}
              </span>
              <span className="text-xs text-velvet-muted">pairs</span>
            </div>
          </div>

          {/* Per-Size Variant Inventory Tracking Module */}
          <div className="md:col-span-2 bg-black/90 border border-white/15 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <span className="text-sm font-medium text-velvet-white block flex items-center gap-2">
                  <span>Per-Size Variant Inventory Tracking</span>
                  <span className="px-2 py-0.5 rounded bg-[#C9A961]/15 text-[#C9A961] text-[9px] font-bold uppercase tracking-wider border border-[#C9A961]/30">
                    Live Sync
                  </span>
                </span>
                <p className="text-xs text-velvet-muted mt-0.5">Toggle available sizes and specify exact real-time stock for each size variant.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-velvet-muted">Active Sizes:</span>
                <span className="px-2 py-0.5 bg-white/10 text-white rounded-md text-xs font-mono font-semibold">
                  {form.sizeInventories.length}
                </span>
              </div>
            </div>

            {/* Standard Size Selector Pills */}
            <div>
              <span className="text-[10px] uppercase tracking-widest text-velvet-muted block mb-2">Toggle Standard Sizes</span>
              <div className="flex flex-wrap gap-2">
                {['6', '7', '8', '9', '10', '11', '12', 'Standard'].map((size) => {
                  const isSelected = form.sizeInventories.some((s) => s.size === size)
                  const currentStock = form.sizeInventories.find((s) => s.size === size)?.stock ?? 0
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => toggleSize(size)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-2 ${
                        isSelected
                          ? 'bg-[#C9A961] text-black border-[#C9A961] shadow-[0_0_12px_rgba(201,169,97,0.25)]'
                          : 'bg-neutral-900/80 text-neutral-400 border-white/10 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      <span>Size {size}</span>
                      {isSelected && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                          currentStock === 0 ? 'bg-red-500/20 text-red-950' : 'bg-black/20 text-black'
                        }`}>
                          {currentStock}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Custom Size Addition */}
            <div className="flex items-center gap-2 max-w-sm">
              <input
                type="text"
                placeholder="Add custom size (e.g. 6.5, UK 9, XL)..."
                value={customSizeInput}
                onChange={(e) => setCustomSizeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSize(); } }}
                className="bg-neutral-900 border border-white/15 rounded-lg px-3 py-2 text-xs text-velvet-white w-full outline-none focus:border-[#C9A961]"
              />
              <button
                type="button"
                onClick={addCustomSize}
                className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs rounded-lg border border-white/10 transition-colors whitespace-nowrap font-medium"
              >
                + Add
              </button>
            </div>

            {/* Per-Size Inventory Table */}
            {form.sizeInventories.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-velvet-muted">
                    Stock Breakdown by Size ({form.sizeInventories.length} variants)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-velvet-muted mr-1">Quick fill:</span>
                    {[0, 5, 10, 20].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => quickFillAllStock(num)}
                        className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 border border-white/10 rounded text-[10px] text-neutral-300 transition-colors hover:text-white"
                      >
                        All {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {form.sizeInventories.map((item) => {
                    const isOOS = Number(item.stock) === 0
                    const isLow = Number(item.stock) > 0 && Number(item.stock) <= 3
                    return (
                      <div
                        key={item.size}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                          isOOS
                            ? 'bg-red-500/10 border-red-500/30'
                            : isLow
                            ? 'bg-amber-500/10 border-amber-500/30'
                            : 'bg-neutral-900/60 border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white px-2 py-0.5 rounded bg-white/10">
                            Size {item.size}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${
                            isOOS ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {isOOS ? 'Out of Stock' : isLow ? `Low (${item.stock})` : 'In Stock'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={item.stock}
                            onChange={(e) => updateSizeStock(item.size, parseInt(e.target.value) || 0)}
                            className="w-16 bg-black border border-white/20 rounded-lg px-2 py-1 text-xs text-right text-white font-mono focus:border-[#C9A961] outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => toggleSize(item.size)}
                            className="text-neutral-500 hover:text-red-400 p-1 transition-colors"
                            title="Remove size"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          <select className="bg-black border border-white/15 rounded-xl px-4 py-3 text-sm text-velvet-white" value={form.gender} onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value as any }))}>
            <option value="">Select Gender</option>
            {GENDERS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
          </select>
          <select className="bg-black border border-white/15 rounded-xl px-4 py-3 text-sm text-velvet-white" value={form.subcategory} onChange={(e) => setForm((prev) => ({ ...prev, subcategory: e.target.value as any }))}>
            <option value="">Select Type</option>
            {SUBCATEGORIES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          
          {/* Inventory, Badges & Sales Toggles */}
          <div className="md:col-span-2 space-y-3">
            <span className="text-[10px] uppercase tracking-widest text-velvet-muted block">Product Flags & Badges</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Featured */}
              <label className="flex items-center justify-between gap-3 px-4 py-3 bg-black border border-white/15 rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
                <span className="text-sm text-velvet-white">Featured</span>
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-white/15 bg-black text-velvet-accent focus:ring-velvet-accent cursor-pointer"
                  checked={form.featured}
                  onChange={(e) => setForm((prev) => ({ ...prev, featured: e.target.checked }))}
                />
              </label>

              {/* Mark as New Drop */}
              <label className="flex items-center justify-between gap-3 px-4 py-3 bg-black border border-white/15 rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-velvet-white">Mark as New Drop</span>
                  <span className="bg-sky-500/10 text-sky-400 text-[9px] px-1.5 py-0.5 rounded border border-sky-500/20 font-bold uppercase">New</span>
                </div>
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-white/15 bg-black text-sky-400 focus:ring-sky-400 cursor-pointer"
                  checked={form.isNew}
                  onChange={(e) => setForm((prev) => ({ ...prev, isNew: e.target.checked }))}
                />
              </label>

              {/* Exclusive / Vault Only */}
              <label className="flex items-center justify-between gap-3 px-4 py-3 bg-black border border-white/15 rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-velvet-white">Exclusive / Vault Only</span>
                  <span className="bg-[#C9A961]/15 text-[#C9A961] text-[9px] px-1.5 py-0.5 rounded border border-[#C9A961]/30 font-bold uppercase">Vault</span>
                </div>
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-white/15 bg-black text-[#C9A961] focus:ring-[#C9A961] cursor-pointer"
                  checked={form.isExclusive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isExclusive: e.target.checked }))}
                />
              </label>

              {/* XP Bonus Drop */}
              <label className="flex items-center justify-between gap-3 px-4 py-3 bg-black border border-white/15 rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-velvet-white">XP Bonus Drop</span>
                  <span className="bg-purple-500/15 text-purple-300 text-[9px] px-1.5 py-0.5 rounded border border-purple-500/30 font-bold uppercase">+XP</span>
                </div>
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-white/15 bg-black text-purple-400 focus:ring-purple-400 cursor-pointer"
                  checked={form.hasXPBonus}
                  onChange={(e) => setForm((prev) => ({ ...prev, hasXPBonus: e.target.checked }))}
                />
              </label>

              {/* Out of Stock */}
              <label className="flex items-center justify-between gap-3 px-4 py-3 bg-black border border-white/15 rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
                <span className="text-sm text-velvet-white">Out of Stock</span>
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-white/15 bg-black text-red-500 focus:ring-red-500 cursor-pointer"
                  checked={form.isOutOfStock}
                  onChange={(e) => setForm((prev) => ({ ...prev, isOutOfStock: e.target.checked }))}
                />
              </label>

              {/* On Sale */}
              <label className="flex items-center justify-between gap-3 px-4 py-3 bg-black border border-white/15 rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-velvet-white">On Sale</span>
                  <span className="bg-emerald-500/10 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold uppercase">Sale</span>
                </div>
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-white/15 bg-black text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                  checked={form.isOnSale}
                  onChange={(e) => setForm((prev) => ({ ...prev, isOnSale: e.target.checked }))}
                />
              </label>
            </div>
          </div>

          {form.isOnSale && (
            <div className="md:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-4 bg-black border border-emerald-500/20 rounded-xl px-4 py-3">
                  <span className="text-sm text-emerald-400 shrink-0">Sale Percentage (%)</span>
                  <input 
                    className="bg-transparent border-none outline-none text-sm text-velvet-white w-full" 
                    placeholder="e.g., 20" 
                    type="number" 
                    min="0" 
                    max="100"
                    value={form.salePercentage} 
                    onChange={(e) => setForm((prev) => ({ ...prev, salePercentage: e.target.value }))} 
                  />
                </div>
                <div className="flex items-center gap-4 bg-black border border-emerald-500/20 rounded-xl px-4 py-3">
                  <span className="text-sm text-emerald-400 shrink-0">Sale Price (Optional)</span>
                  <input 
                    className="bg-transparent border-none outline-none text-sm text-velvet-white w-full" 
                    placeholder="e.g., 5999" 
                    type="number" 
                    min="0" 
                    value={form.salePrice} 
                    onChange={(e) => setForm((prev) => ({ ...prev, salePrice: e.target.value }))} 
                  />
                </div>
              </div>
            </div>
          )}

          <input className="md:col-span-2 bg-black border border-white/15 rounded-xl px-4 py-3 text-sm text-velvet-white" placeholder="Image URL (optional - use upload instead)" value={form.image} onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))} />
          <div className="md:col-span-2">
            <label className="flex items-center gap-3 px-4 py-3 bg-black border border-white/15 rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
              <Upload size={16} className="text-velvet-accent" />
              <span className="text-sm text-velvet-white">Upload Primary Image</span>
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" disabled={uploadingImage} />
              {uploadingImage && <span className="text-xs text-velvet-muted ml-auto">Uploading...</span>}
            </label>
            {imagePreview && (
              <div className="mt-3 relative">
                <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg" />
                <button
                  onClick={clearImage}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-3 px-4 py-3 bg-black border border-white/15 rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
              <Upload size={16} className="text-velvet-accent" />
              <span className="text-sm text-velvet-white">Upload Additional Images (up to 3 more)</span>
              <input type="file" accept="image/*" multiple onChange={handleMultipleImageChange} className="hidden" disabled={uploadingImage || form.images.length >= 4} />
              <span className="text-xs text-velvet-muted ml-auto">{form.images.length}/4</span>
            </label>
            {imagePreviews.length > 0 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {imagePreviews.map((img, idx) => (
                  <div key={idx} className="relative">
                    <img src={img} alt={`Preview ${idx + 1}`} className="w-20 h-20 object-cover rounded-lg" />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <textarea className="md:col-span-2 bg-black border border-white/15 rounded-xl px-4 py-3 text-sm text-velvet-white min-h-[110px]" placeholder="Description" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
        </div>
        <div className="flex gap-3 mt-4">
          <Button onClick={submit} isLoading={isLoading}>{editingProduct ? 'Update Product' : 'Create Product'}</Button>
          {editingProduct && (
            <Button variant="secondary" onClick={() => { setEditingProduct(null); setForm(emptyForm); setImagePreview(null); setImagePreviews([]) }}>
              Cancel Edit
            </Button>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-velvet-card border border-white/10 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-4 text-[10px] uppercase tracking-widest text-velvet-muted border-b border-white/5">
          <div className="col-span-3">Product</div>
          <div className="col-span-1">Stock</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1">Visible</div>
          <div className="col-span-1">Featured</div>
          <div className="col-span-2">Price</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        <div className="divide-y divide-white/5">
          {products.map((product) => (
            <div key={product.id} className="grid grid-cols-12 px-5 py-4 items-center">
              <div className="col-span-3">
                <div className="text-velvet-white flex items-center gap-1.5 flex-wrap">
                  <span className="font-medium">{product.name}</span>
                  {product.isOnSale && <span className="bg-emerald-500/10 text-emerald-400 text-[8px] px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold uppercase">-{product.salePercentage}%</span>}
                  {product.isNew && <span className="bg-sky-500/10 text-sky-400 text-[8px] px-1.5 py-0.5 rounded border border-sky-500/20 font-bold uppercase">New Drop</span>}
                  {product.isExclusive && <span className="bg-[#C9A961]/15 text-[#C9A961] text-[8px] px-1.5 py-0.5 rounded border border-[#C9A961]/30 font-bold uppercase">Vault Only</span>}
                  {product.hasXPBonus && <span className="bg-purple-500/15 text-purple-300 text-[8px] px-1.5 py-0.5 rounded border border-purple-500/30 font-bold uppercase">+XP Bonus</span>}
                </div>
                <div className="text-xs text-velvet-muted mt-1 line-clamp-1">{product.brand}</div>
              </div>
              <div className="col-span-1 text-velvet-white">
                <span className="font-medium">{product.stock}</span>
                {product.sizesWithStock && product.sizesWithStock.length > 0 && (
                  <div className="text-[9px] mt-0.5">
                    {product.sizesWithStock.some(s => s.stock === 0) ? (
                      <span className="text-red-400 font-medium">
                        {product.sizesWithStock.filter(s => s.stock === 0).length} OOS
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-medium">{product.sizesWithStock.length} sizes</span>
                    )}
                  </div>
                )}
              </div>
              <div className="col-span-2">
                {product.isOutOfStock ? (
                  <span className="text-red-400 text-[10px] uppercase tracking-widest bg-red-400/10 px-2 py-1 rounded">Out of Stock</span>
                ) : product.isOnSale ? (
                  <span className="text-emerald-400 text-[10px] uppercase tracking-widest bg-emerald-400/10 px-2 py-1 rounded">On Sale</span>
                ) : (
                  <span className="text-velvet-muted text-[10px] uppercase tracking-widest">Normal</span>
                )}
              </div>
              <div className="col-span-1 text-velvet-muted">{product.isVisible ? 'Active' : 'Inactive'}</div>
              <div className="col-span-1 text-velvet-muted">{product.featured ? 'Yes' : 'No'}</div>
              <div className="col-span-2">
                <div className="text-velvet-white">{formatPrice(product.price)}</div>
                {product.isOnSale && (
                  <div className="text-[10px] text-velvet-muted line-through">
                    {formatPrice(product.price / (1 - (product.salePercentage || 0) / 100))}
                  </div>
                )}
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <button className="px-3 py-2 text-[10px] uppercase tracking-widest border border-white/20 rounded-lg text-velvet-white hover:bg-white/10" onClick={() => startEdit(product)}>Edit</button>
                <button className="px-3 py-2 text-[10px] uppercase tracking-widest border border-white/20 rounded-lg text-amber-300 hover:bg-amber-400/10" onClick={() => toggleStock(product.id, !product.isVisible)}>
                  {product.isVisible ? 'Hide' : 'Show'}
                </button>
                <button
                  className="px-3 py-2 text-[10px] uppercase tracking-widest border border-red-500/50 rounded-lg text-red-500 hover:bg-red-500/20"
                  onClick={() => handleHardDelete(product)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!isLoading && products.length === 0 && (
            <div className="px-6 py-10 text-center text-velvet-muted">No products found.</div>
          )}
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {products.map((product) => (
          <div key={product.id} className="bg-velvet-card border border-white/10 rounded-2xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0 pr-2">
                <div className="text-velvet-white font-medium flex items-center gap-1.5 flex-wrap">
                  <span>{product.name}</span>
                  {product.isOnSale && <span className="text-emerald-400 text-[10px] font-bold">-{product.salePercentage}%</span>}
                  {product.isNew && <span className="bg-sky-500/10 text-sky-400 text-[8px] px-1.5 py-0.5 rounded border border-sky-500/20 font-bold uppercase">New</span>}
                  {product.isExclusive && <span className="bg-[#C9A961]/15 text-[#C9A961] text-[8px] px-1.5 py-0.5 rounded border border-[#C9A961]/30 font-bold uppercase">Vault</span>}
                  {product.hasXPBonus && <span className="bg-purple-500/15 text-purple-300 text-[8px] px-1.5 py-0.5 rounded border border-purple-500/30 font-bold uppercase">+XP</span>}
                </div>
                <div className="text-xs text-velvet-muted mt-1">{product.brand}</div>
              </div>
              <div className="text-right">
                <div className="text-velvet-white font-heading">{formatPrice(product.price)}</div>
                {product.isOutOfStock && <div className="text-[8px] text-red-400 uppercase tracking-widest font-bold">Out of Stock</div>}
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-velvet-muted mb-3">
              <span>
                Stock: {product.stock}
                {product.sizesWithStock && product.sizesWithStock.some(s => s.stock === 0) && (
                  <span className="text-red-400 ml-1.5 font-medium">({product.sizesWithStock.filter(s => s.stock === 0).length} sizes OOS)</span>
                )}
              </span>
              <span className={product.isVisible ? 'text-emerald-400' : 'text-amber-400'}>
                {product.isVisible ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 px-3 py-2 text-[10px] uppercase tracking-widest border border-white/20 rounded-lg text-velvet-white hover:bg-white/10" onClick={() => startEdit(product)}>Edit</button>
              <button className="flex-1 px-3 py-2 text-[10px] uppercase tracking-widest border border-white/20 rounded-lg text-amber-300 hover:bg-amber-400/10" onClick={() => toggleStock(product.id, !product.isVisible)}>
                {product.isVisible ? 'Hide' : 'Show'}
              </button>
              <button
                className="flex-1 px-3 py-2 text-[10px] uppercase tracking-widest border border-red-500/50 rounded-lg text-red-500 hover:bg-red-500/20"
                onClick={() => handleHardDelete(product)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {!isLoading && products.length === 0 && (
          <div className="px-6 py-10 text-center text-velvet-muted bg-velvet-card border border-white/10 rounded-2xl">No products found.</div>
        )}
      </div>
    </div>
  )
}
