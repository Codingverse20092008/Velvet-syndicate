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

  const { featured, category, sort, limit, offset, search } = req.query;

  if (featured === 'true') {
    const parsedLimit = Number.parseInt((limit as string) || '10', 10);
    const limitNum = Number.isFinite(parsedLimit) ? parsedLimit : 10;
    const featuredResult = await getFeaturedProducts();
    const slicedResult = featuredResult.slice(0, limitNum);
    return successResponse(res, { 
      products: slicedResult.map(mapProduct) 
    });
  }

  try {
    const filters = {
      category: category as string | undefined,
      featured: featured as string | undefined,
      sort: (sort as string) || 'createdAt',
      limit: Number.parseInt((limit as string) || '50', 10),
      offset: Number.parseInt((offset as string) || '0', 10),
      search: (search as string) || undefined,
    };

    const parsed = productFiltersSchema.parse(filters);
    const result = await getProducts(parsed);

    return successResponse(res, {
      products: result.products.map(mapProduct),
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  } catch (err) {
    console.error("SEARCH ERROR:", err);
    // @ts-ignore
    return res.status(500).json({ success: false, message: "Search failed", error: err.message });
  }
}));

// GET /api/products/:slug
router.get('/:slug', asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const product = await getProductBySlug(slug);

  return successResponse(res, {
    product: mapProduct(product)
  });
}));


export default router;
