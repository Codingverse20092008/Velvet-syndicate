import type { Metadata } from 'next'
import { apiFetch, getFullImageUrl } from '@/lib/api'
import ProductClient from './ProductClient'

interface Props {
  params: {
    slug: string
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = params

  try {
    const res = await apiFetch(`/products/${slug}`, { skipAuth: true })
    if (res.ok) {
      const json = await res.json()
      const product = json?.data?.product

      if (product) {
        const title = `${product.name} | Velvet Syndicate`
        const priceStr = `₹${product.price}`

        // Clean truncated description highlighting pricing and limited sneaker availability
        const rawDesc = (product.description || '')
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim()

        const cleanSnippet = rawDesc.length > 120 ? `${rawDesc.slice(0, 117)}...` : rawDesc
        const description = cleanSnippet
          ? `${cleanSnippet} Available now for ${priceStr}. Limited sneaker availability — secure your pair at Velvet Syndicate.`
          : `Limited sneaker availability priced at ${priceStr}. Handcrafted luxury footwear by Velvet Syndicate.`

        const ogDescription = rawDesc
          ? `${rawDesc.length > 150 ? rawDesc.slice(0, 147) + '...' : rawDesc} — ${priceStr}`
          : `${product.name} — ${priceStr}`

        const rawImage =
          product.imageUrl ||
          (Array.isArray(product.images) && product.images[0]) ||
          (product.variants?.[0]?.images && product.variants[0].images[0]) ||
          product.image ||
          '/favicon.png'

        const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://velvetsyndicate.shop').replace(/\/$/, '')
        const fullImage = getFullImageUrl(rawImage)
        const ogImageUrl = fullImage.startsWith('http')
          ? fullImage
          : `${siteUrl}${fullImage.startsWith('/') ? '' : '/'}${fullImage}`

        return {
          title,
          description,
          openGraph: {
            title: product.name,
            description: ogDescription,
            images: [ogImageUrl],
            type: 'website',
          },
          twitter: {
            card: 'summary_large_image',
            title: product.name,
            images: [ogImageUrl],
          },
        }
      }
    }
  } catch (error) {
    console.error(`[generateMetadata] Failed to fetch product metadata for slug "${slug}":`, error)
  }

  // Fallback metadata if fetch fails or product is not found
  const fallbackName = slug
    ? slug
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Exclusive Footwear'
  const fallbackTitle = `${fallbackName} | Velvet Syndicate`
  const fallbackDescription = 'Discover limited edition luxury sneakers and footwear crafted for silent presence at Velvet Syndicate.'

  return {
    title: fallbackTitle,
    description: fallbackDescription,
    openGraph: {
      title: fallbackTitle,
      description: fallbackDescription,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: fallbackTitle,
    },
  }
}

export default function ProductPage({ params }: Props) {
  return <ProductClient slug={params.slug} />
}
