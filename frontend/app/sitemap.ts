import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rawBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://velvetsyndicate.shop'
  const baseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl

  // Core static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/vault`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ]

  let productRoutes: MetadataRoute.Sitemap = []

  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const endpoint = `${apiBase.replace(/\/$/, '')}/api/products?limit=100`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)

    const res = await fetch(endpoint, {
      signal: controller.signal,
      next: { revalidate: 3600 },
    })
    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      let products: any[] = []

      if (Array.isArray(data?.data?.products)) {
        products = data.data.products
      } else if (Array.isArray(data?.products)) {
        products = data.products
      } else if (Array.isArray(data?.data)) {
        products = data.data
      }

      productRoutes = products
        .filter((p: any) => p && p.slug && p.isVisible !== false)
        .map((product: any) => ({
          url: `${baseUrl}/product/${product.slug}`,
          lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
          changeFrequency: 'daily',
          priority: 0.8,
        }))
    }
  } catch (error) {
    console.warn('[sitemap] Failed to fetch products for sitemap, falling back to static routes:', error)
  }

  return [...staticRoutes, ...productRoutes]
}
