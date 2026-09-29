import ProductPage, { generateMetadata as baseGenerateMetadata } from '@/app/product/[slug]/page'
import type { Metadata } from 'next'

interface Props {
  params: {
    slug: string
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return baseGenerateMetadata({ params })
}

export default ProductPage
