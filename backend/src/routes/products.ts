import { Router, Request, Response } from 'express';
import { productFiltersSchema } from '../lib/schemas';
import { getProducts, getFeaturedProducts, getProductBySlug } from '../services/product.service';
import { asyncHandler } from '../lib/api-handler-express';
import { checkRateLimit } from '../lib/rate-limit';
import { RateLimitError } from '../lib/errors';
import { successResponse } from '../lib/api-response-express';

const router = Router();

// GET /api/products
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const ip = req.ip || 'anonymous';
  const { allowed } = await checkRateLimit(`products:${ip}`);
  if (!allowed) throw new RateLimitError();

  const { featured, category, sort, limit, offset } = req.query;

  // Function to map product from DB to standardized API format
  const mapProduct = (p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price,
    images: [p.imageUrl],
    sizes: p.sizes.map((s: any) => parseFloat(s.size)).sort((a: number, b: number) => a - b),
    category: p.category,
    featured: p.featured,
    stock: Object.fromEntries(p.sizes.map((s: any) => [s.size, s.stock])),
  });

  if (featured === 'true') {
    const featuredResult = await getFeaturedProducts();
    return successResponse(res, { 
      products: featuredResult.map(mapProduct) 
    });
  }

  const filters = {
    category: category as string | undefined,
    featured: featured as string | undefined,
    sort: (sort as string) || 'createdAt',
    limit: parseInt((limit as string) || '50'),
    offset: parseInt((offset as string) || '0'),
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
}));

// GET /api/products/:slug
router.get('/:slug', asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const product = await getProductBySlug(slug);

  const stock: Record<string, number> = {};
  const sizes: number[] = [];

  for (const s of product.sizes) {
    stock[s.size] = s.stock;
    const sizeNum = parseFloat(s.size);
    if (!isNaN(sizeNum)) sizes.push(sizeNum);
  }

  return successResponse(res, {
    product: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      images: [product.imageUrl],
      sizes: sizes.sort((a, b) => a - b),
      category: product.category,
      featured: product.featured,
      stock,
    },
  });
}));


export default router;
