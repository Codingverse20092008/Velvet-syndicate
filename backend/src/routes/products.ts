import { Router, Request, Response } from 'express';
import { productFiltersSchema } from '../lib/schemas';
import { getProducts, getFeaturedProducts, getProductBySlug } from '../services/product.service';
import { asyncHandler } from '../lib/api-handler-express';
import { checkRateLimit } from '../lib/rate-limit';
import { RateLimitError } from '../lib/errors';
import { successResponse } from '../lib/api-response-express';

const router = Router();

// Function to map product from DB to standardized API format
const mapProduct = (p: any) => ({
  id: p.id,
  name: p.name ?? '',
  brand: p.brand ?? '',
  slug: p.slug ?? '',
  description: p.description ?? '',
  price: Number(p.price ?? 0),
  category: p.category ?? 'footwear',
  gender: p.gender ?? 'unisex',
  productType: p.productType ?? 'sneakers',
  featured: Boolean(p.featured),
  variants: (p.variants || []).map((v: any) => ({
    id: v.id,
    name: v.name ?? '',
    color: v.color ?? '',
    slug: v.slug,
    images: (v.images || []).map((img: any) => img.imageUrl),
    sizes: (v.sizes || []).map((s: any) => ({
      size: s.size,
      stock: Number(s.stock ?? 0)
    })).sort((a: any, b: any) => parseFloat(a.size) - parseFloat(b.size))
  }))
});

// GET /api/products
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const ip = req.ip || 'anonymous';
  const { allowed } = await checkRateLimit(`products:${ip}`);
  if (!allowed) throw new RateLimitError();

  const validatedFilters = productFiltersSchema.parse(req.query);

  if (validatedFilters.featured) {
    const featuredResult = await getFeaturedProducts();
    const slicedResult = featuredResult.slice(0, validatedFilters.limit);
    return successResponse(res, {
      products: slicedResult.map(mapProduct)
    });
  }

  const result = await getProducts(validatedFilters as any);

  return successResponse(res, {
    products: result.products.map(mapProduct),
    pagination: {
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      nextCursor: result.nextCursor,
      hasNextPage: result.hasNextPage
    },
  });
}));

// GET /api/products/:slug
router.get('/:slug', asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const product = await getProductBySlug(slug);

  return successResponse(res, {
    product: mapProduct(product)
  });
}));

// GET /api/categories
router.get('/categories/all', asyncHandler(async (req: Request, res: Response) => {
  const categories = ['sneakers', 'footwear', 'boots', 'sandals', 'slippers'];
  return successResponse(res, {
    categories
  });
}));


export default router;
