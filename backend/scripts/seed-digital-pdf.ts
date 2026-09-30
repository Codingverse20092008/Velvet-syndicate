import { db } from '../src/lib/db';
import { products, productVariants, productSizes, productVariantImages } from '../src/lib/schema';
import { eq } from 'drizzle-orm';

async function seedDigitalPdf() {
  console.log('🌱 Seeding Digital PDF Product: WBCHSE Class 12 Computer Application...');

  const productId = 'prod_digital_sem3_cs';
  const variantId = 'var_digital_sem3_cs';
  const sizeId = 'size_digital_sem3_cs';
  const imageId = 'img_digital_sem3_cs';
  const coverImage = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1000';

  // 1. Check if product already exists
  const existingProduct = await db.select().from(products).where(eq(products.id, productId));

  if (existingProduct.length > 0) {
    // Update existing product
    await db.update(products).set({
      name: 'WBCHSE Class 12 Computer Application (Sem 3) E-Book',
      slug: 'wbchse-sem3-computer-guide',
      description: 'Official Semester 3 Modern Computer Application Guide & Question Bank. Unlocked instantly upon successful payment.',
      price: 60,
      imageUrl: coverImage,
      brand: 'EduTips',
      category: 'digital',
      gender: 'unisex',
      productType: 'ebook',
      featured: true,
      isVisible: true,
      isNew: true,
      isExclusive: true,
      features: JSON.stringify([
        'Complete WBCHSE Semester 3 Syllabus',
        'Modern Computer Application Solved Papers',
        'High-Yield Expected Questions & Notes',
        'Instant High-Speed PDF Download Unlock',
      ]),
    }).where(eq(products.id, productId));

    // Ensure variant exists or update
    const existingVariant = await db.select().from(productVariants).where(eq(productVariants.id, variantId));
    if (existingVariant.length > 0) {
      await db.update(productVariants).set({
        name: 'Digital Edition (PDF)',
        color: 'Gold',
        slug: 'wbchse-sem3-computer-guide-pdf',
      }).where(eq(productVariants.id, variantId));
    } else {
      await db.insert(productVariants).values({
        id: variantId,
        productId,
        name: 'Digital Edition (PDF)',
        color: 'Gold',
        slug: 'wbchse-sem3-computer-guide-pdf',
      });
    }

    // Ensure image exists or update
    const existingImg = await db.select().from(productVariantImages).where(eq(productVariantImages.id, imageId));
    if (existingImg.length > 0) {
      await db.update(productVariantImages).set({
        imageUrl: coverImage,
      }).where(eq(productVariantImages.id, imageId));
    } else {
      await db.insert(productVariantImages).values({
        id: imageId,
        variantId,
        imageUrl: coverImage,
      });
    }

    // Ensure size exists or update
    const existingSize = await db.select().from(productSizes).where(eq(productSizes.id, sizeId));
    if (existingSize.length > 0) {
      await db.update(productSizes).set({
        size: 'DIGITAL',
        stock: 9999,
      }).where(eq(productSizes.id, sizeId));
    } else {
      await db.insert(productSizes).values({
        id: sizeId,
        variantId,
        size: 'DIGITAL',
        stock: 9999,
      });
    }
  } else {
    // 2. Insert into products
    await db.insert(products).values({
      id: productId,
      name: 'WBCHSE Class 12 Computer Application (Sem 3) E-Book',
      slug: 'wbchse-sem3-computer-guide',
      description: 'Official Semester 3 Modern Computer Application Guide & Question Bank. Unlocked instantly upon successful payment.',
      price: 60,
      imageUrl: coverImage,
      brand: 'EduTips',
      category: 'digital',
      gender: 'unisex',
      productType: 'ebook',
      featured: true,
      isVisible: true,
      isNew: true,
      isExclusive: true,
      features: JSON.stringify([
        'Complete WBCHSE Semester 3 Syllabus',
        'Modern Computer Application Solved Papers',
        'High-Yield Expected Questions & Notes',
        'Instant High-Speed PDF Download Unlock',
      ]),
    });

    // 3. Insert into productVariants
    await db.insert(productVariants).values({
      id: variantId,
      productId,
      name: 'Digital Edition (PDF)',
      color: 'Gold',
      slug: 'wbchse-sem3-computer-guide-pdf',
    });

    // 4. Insert image
    await db.insert(productVariantImages).values({
      id: imageId,
      variantId,
      imageUrl: coverImage,
    });

    // 5. Insert size
    await db.insert(productSizes).values({
      id: sizeId,
      variantId,
      size: 'DIGITAL',
      stock: 9999,
    });
  }

  console.log('✅ Digital PDF Product seeded successfully:');
  console.log({
    productId,
    slug: 'wbchse-sem3-computer-guide',
    price: 60,
    variantId,
    sizeId,
    size: 'DIGITAL',
    stock: 9999,
  });
}

seedDigitalPdf()
  .then(() => {
    console.log('🚀 Digital PDF seed completed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error seeding digital PDF:', err);
    process.exit(1);
  });
