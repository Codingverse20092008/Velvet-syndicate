'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAdminStore, AdminProduct } from '@/store/adminStore'
import { formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { apiFetch } from '@/lib/api'

type ProductForm = {
  name: string
  price: string
  image: string
  images: string[]
  description: string
  stock: string
  brand: string
  color: string
  gender: 'men' | 'women' | ''
  subcategory: 'casual' | 'walking' | 'jogging' | 'running' | 'sports' | 'sneakers' | ''
}

const emptyForm: ProductForm = {
  name: '',
  price: '',
  image: '',
  images: [],
  description: '',
  stock: '',
  brand: '',
  color: '',
  gender: '',
  subcategory: '',
}

const GENDERS = ['men', 'women'] as const
const SUBCATEGORIES = ['casual', 'walking', 'jogging', 'running', 'sports', 'sneakers'] as const

export default function AdminProductsPage() {
  const {
    products,
    isLoading,
    error,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleStock,
  } = useAdminStore()
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const title = useMemo(() => (editingProduct ? 'Edit Product' : 'Add Product'), [editingProduct])

  const getFullImageUrl = (url: string): string => {
    // If URL is already absolute, return it
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    // If URL starts with /uploads, prepend the API URL
    if (url.startsWith('/uploads')) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
      // Remove trailing slash from API URL if present
      const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl
      return `${baseUrl}${url}`
    }
    return url
  }

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
      if (data.success) {
        const fullImageUrl = getFullImageUrl(data.imageUrl)
        setForm((prev) => ({ ...prev, image: fullImageUrl }))
        setImagePreview(fullImageUrl)
      } else {
        throw new Error(data.error || 'Upload failed')
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
      if (data.success) {
        const fullImageUrls = data.imageUrls.map((url: string) => getFullImageUrl(url))
        setForm((prev) => ({ ...prev, images: [...prev.images, ...fullImageUrls] }))
        setImagePreviews(prev => [...prev, ...fullImageUrls])
      } else {
        throw new Error(data.error || 'Upload failed')
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
    const payload = {
      name: form.name.trim(),
      price: Number(form.price),
      image: form.image.trim() || (form.images[0] || ''),
      images: form.images,
      description: form.description.trim(),
      stock: Number(form.stock),
      brand: form.brand.trim(),
      color: form.color.trim(),
      gender: form.gender || 'unisex',
      subcategory: form.subcategory || 'sneakers',
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
    setForm({
      name: product.name,
      price: String(product.price),
      image: product.image,
      images: [],
      description: product.description,
      stock: String(product.stock),
      brand: product.brand,
      color: '',
      gender: '',
      subcategory: '',
    })
    setImagePreview(product.image)
    setImagePreviews([])
  }

  const handleDeactivate = async (product: AdminProduct) => {
    if (!product.isVisible) return

    const confirmed = window.confirm('Are you sure?')
    if (!confirmed) return
    await deleteProduct(product.id)
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
          <input className="bg-black border border-white/15 rounded-xl px-4 py-3 text-sm text-velvet-white" placeholder="Stock" type="number" min="0" value={form.stock} onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))} />
          <input className="bg-black border border-white/15 rounded-xl px-4 py-3 text-sm text-velvet-white" placeholder="Color" value={form.color} onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))} />
          <select className="bg-black border border-white/15 rounded-xl px-4 py-3 text-sm text-velvet-white" value={form.gender} onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value as any }))}>
            <option value="">Select Gender</option>
            {GENDERS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
          </select>
          <select className="bg-black border border-white/15 rounded-xl px-4 py-3 text-sm text-velvet-white" value={form.subcategory} onChange={(e) => setForm((prev) => ({ ...prev, subcategory: e.target.value as any }))}>
            <option value="">Select Type</option>
            {SUBCATEGORIES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
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

      <div className="bg-velvet-card border border-white/10 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-4 text-[10px] uppercase tracking-widest text-velvet-muted border-b border-white/5">
          <div className="col-span-4">Product</div>
          <div className="col-span-1">Stock</div>
          <div className="col-span-2">Brand</div>
          <div className="col-span-1">Visible</div>
          <div className="col-span-2">Price</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        <div className="divide-y divide-white/5">
          {products.map((product) => (
            <div key={product.id} className="grid grid-cols-12 px-5 py-4 items-center">
              <div className="col-span-4">
                <div className="text-velvet-white">{product.name}</div>
                <div className="text-xs text-velvet-muted mt-1 line-clamp-1">{product.description}</div>
              </div>
              <div className="col-span-1 text-velvet-white">{product.stock}</div>
              <div className="col-span-2 text-velvet-muted">{product.brand}</div>
              <div className="col-span-1 text-velvet-muted">{product.isVisible ? 'Active' : 'Inactive'}</div>
              <div className="col-span-2 text-velvet-white">{formatPrice(product.price)}</div>
              <div className="col-span-2 flex justify-end gap-2">
                <button className="px-3 py-2 text-[10px] uppercase tracking-widest border border-white/20 rounded-lg text-velvet-white hover:bg-white/10" onClick={() => startEdit(product)}>Edit</button>
                <button className="px-3 py-2 text-[10px] uppercase tracking-widest border border-white/20 rounded-lg text-amber-300 hover:bg-amber-400/10" onClick={() => toggleStock(product.id, !product.isVisible)}>
                  {product.isVisible ? 'Hide' : 'Show'}
                </button>
                <button
                  className="px-3 py-2 text-[10px] uppercase tracking-widest border border-red-400/20 rounded-lg text-red-300 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={() => handleDeactivate(product)}
                  disabled={!product.isVisible}
                >
                  {product.isVisible ? 'Deactivate' : 'Inactive'}
                </button>
              </div>
            </div>
          ))}
          {!isLoading && products.length === 0 && (
            <div className="px-6 py-10 text-center text-velvet-muted">No products found.</div>
          )}
        </div>
      </div>
    </div>
  )
}
