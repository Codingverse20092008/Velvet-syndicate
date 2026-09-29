import { Router, Request, Response } from 'express';
import { db } from '../lib/db';
import { products } from '../lib/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../lib/logger';
import { env } from '../lib/env';

const router = Router();

export interface InventoryItem {
  id: string;
  name: string;
  price: number;
  category: string;
  productType: string;
  sizes: string[];
  inStock: boolean;
  sizingAdvice: string;
  line: string;
}

// Memory cache for dynamic live inventory (refreshes every 60 seconds)
let cachedInventory: {
  contextText: string;
  items: InventoryItem[];
  timestamp: number;
} | null = null;
const CACHE_TTL_MS = 60 * 1000;

/**
 * Intelligent sizing guidance based on sneaker silhouette / model
 */
export function getSizingAdvice(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('air force 1') || lower.includes('af1') || lower.includes('air force')) {
    return 'Suggest going 0.5 size down for narrow feet or snug fit, otherwise True to Size';
  }
  if (lower.includes('sb dunk')) {
    return 'True to Size (Padded skate tongue; suggest 0.5 size up for wide feet)';
  }
  if (lower.includes('dunk')) {
    return 'True to Size';
  }
  if (lower.includes('jordan 1') || lower.includes('aj1')) {
    return 'Fits True to Size';
  }
  if (lower.includes('samba')) {
    return 'Fits True to Size (Sleek low-profile fit)';
  }
  if (lower.includes('550')) {
    return 'Fits True to Size';
  }
  if (lower.includes('suede')) {
    return 'Fits True to Size (Generous toe box)';
  }
  if (lower.includes('air max') || lower.includes('guidelo') || lower.includes('climawarm') || lower.includes('running')) {
    return 'Fits True to Size (Athletic lockdown)';
  }
  if (lower.includes('boot') || lower.includes('chelsea')) {
    return 'Fits True to Size';
  }
  return 'Fits True to Size';
}

/**
 * Dynamically queries all active products from DB and formats compact context block
 */
export async function getLiveCatalogContext(forceRefresh = false): Promise<{
  contextText: string;
  items: InventoryItem[];
}> {
  const now = Date.now();
  if (!forceRefresh && cachedInventory && now - cachedInventory.timestamp < CACHE_TTL_MS) {
    return cachedInventory;
  }

  try {
    const rawProducts = await db.query.products.findMany({
      where: eq(products.isVisible, true),
      with: {
        variants: {
          with: {
            sizes: true,
          },
        },
      },
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    });

    const items: InventoryItem[] = rawProducts.map((p) => {
      const sizeStockMap = new Map<string, number>();
      let totalStock = 0;

      for (const variant of p.variants || []) {
        for (const s of variant.sizes || []) {
          const sz = String(s.size).trim();
          if (sz) {
            const stockVal = Number(s.stock ?? 0);
            sizeStockMap.set(sz, (sizeStockMap.get(sz) || 0) + stockVal);
            totalStock += stockVal;
          }
        }
      }

      // Filter available sizes (sizes with stock > 0, or fallback to all unique if stock untracked)
      let availableSizes = Array.from(sizeStockMap.entries())
        .filter(([_, stock]) => stock > 0)
        .map(([size]) => size);

      if (availableSizes.length === 0 && sizeStockMap.size > 0 && !p.isOutOfStock) {
        availableSizes = Array.from(sizeStockMap.keys());
      }

      // Sort numeric / UK sizes
      availableSizes.sort((a, b) => {
        const numA = parseFloat(a.replace(/[^0-9.]/g, ''));
        const numB = parseFloat(b.replace(/[^0-9.]/g, ''));
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      });

      const isSoldOut = Boolean(p.isOutOfStock) || (totalStock === 0 && sizeStockMap.size > 0);
      const sizesText = isSoldOut || availableSizes.length === 0
        ? 'Currently Sold Out'
        : `Sizes UK ${availableSizes.join(', ')}`;

      const sizingAdvice = getSizingAdvice(p.name);
      const formattedPrice = `₹${Math.round(p.price).toLocaleString('en-IN')}`;
      const line = `- ${p.name} (${formattedPrice} | ${sizesText} | ${sizingAdvice})`;

      return {
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category,
        productType: p.productType,
        sizes: availableSizes,
        inStock: !isSoldOut,
        sizingAdvice,
        line,
      };
    });

    const lines = [
      'CURRENT LIVE INVENTORY:',
      ...items.map((i) => i.line),
    ];

    const contextText = lines.join('\n');
    cachedInventory = { contextText, items, timestamp: now };
    return cachedInventory;
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to query live catalog for AI grounding');
    if (cachedInventory) return cachedInventory;
    return {
      contextText: 'CURRENT LIVE INVENTORY:\n- Catalog updating...',
      items: [],
    };
  }
}

/**
 * Builds the complete Velvet Syndicate system prompt with store policies and live catalog
 */
export function buildSystemPrompt(inventoryContext: string): string {
  return `You are Cipher, the private luxury streetwear stylist and sneaker concierge for Velvet Syndicate.

BRAND IDENTITY & SANCTUARY:
- Brand Identity: Velvet Syndicate — high-grade streetwear and sneaker sanctuary in India. We curate grail-level kicks, ultra-rare deadstock grails, and luxury street culture for discerning collectors.

VIP CLUB REWARDS:
- Silver Member: Default/New tier upon registration, gets standard drop access & ₹150 welcome store credit.
- Gold Member: Unlocked after 1+ purchases, gains a 15-minute early access window to all public drops.
- Obsidian Elite: Unlocked after 2+ purchases, receives guaranteed drop allocations, concierge priority, and private vault releases.

SUNDAY DEADSTOCK RAFFLES:
- Limited deadstock pairs allocated via a fair ballot draw every Sunday.
- Verified members enter throughout the week; ballot winners receive an exclusive purchase reservation before public drops sell out.

SHIPPING & DELIVERY:
- All-India shipping via BlueDart / Delhivery (3–5 working days).
- Free shipping on all orders over ₹1,999.
- Packaged securely in discreet double-boxed packaging with tamper-proof seal.

PAYMENT OPTIONS:
- Cash on Delivery (COD) supported across India.
- Prepaid methods: UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, and NetBanking.

RETURNS & EXCHANGES:
- 7-day size replacement guarantee.
- Hassle-free size swaps arranged promptly if the pair doesn't fit like a glove.

AUTHENTICITY & CRAFTSMANSHIP:
- Premium deadstock craftsmanship: high-grade leather, original box, spare laces, and official Velvet Syndicate collector verification cards included with every pair.

${inventoryContext}

STRICT ANSWERING RULES:
1. Concierge Persona: Cipher — crisp, street-smart, polite, luxury tone. Speak with understated confidence and sneakerhead precision.
2. Response Length: Limit responses strictly to 2–4 concise sentences. Never ramble or provide walls of text.
3. Pricing & Sizing: Always quote exact INR prices (₹) and size recommendations directly from the injected live inventory above.
4. Out-of-Catalog Inquiries: If asked about something we don't sell (e.g. Yeezy, tech gadgets, unrelated brands), smoothly steer them toward our curated catalog and current drops.
5. Absolute Grounding: Stick strictly to the store knowledge and live inventory above. Never fabricate nonexistent inventory or policies.`;
}

/**
 * Cipher Grounded Deterministic Fallback Engine
 * Ensures 100% reliability, instant responses, and zero downtime
 */
export function getCipherGroundedFallback(
  userQuery: string,
  items: InventoryItem[]
): string {
  const q = userQuery.toLowerCase().trim();

  // 1. Check for specific product inquiry
  const matchedItem = items.find((item) => {
    const nameLower = item.name.toLowerCase();
    const parts = nameLower.split(/[\s“”—-]+/).filter((w) => w.length > 2);
    if (q.includes(nameLower)) return true;
    let matchCount = 0;
    for (const part of parts) {
      if (q.includes(part)) matchCount++;
    }
    return matchCount >= Math.min(2, parts.length);
  });

  // 2. Greetings
  if (q === 'hello' || q === 'hi' || q === 'hey' || q.startsWith('hello ') || q.startsWith('hi ')) {
    return `Welcome to the Syndicate. I am Cipher, your private sneaker concierge. Whether you need sizing guidance on our live drops, raffle reservations, or price breakdowns, tell me what silhouette you're pursuing.`;
  }

  // 3. Sizing queries
  if (q.includes('size') || q.includes('sizing') || q.includes('fit') || q.includes('fits')) {
    if (matchedItem) {
      const priceStr = `₹${Math.round(matchedItem.price).toLocaleString('en-IN')}`;
      const sizesStr = matchedItem.sizes.length > 0 ? `UK ${matchedItem.sizes.join(', ')}` : 'standard sizing';
      return `For the ${matchedItem.name} (${priceStr}), it ${matchedItem.sizingAdvice.toLowerCase()} and is currently stocked in sizes ${sizesStr}. If you're between sizes, our 7-day size replacement guarantee has you completely covered. Dispatched double-boxed with express 3–5 day delivery across India.`;
    }
    if (q.includes('air force') || q.includes('af1')) {
      return `Our Air Force 1 silhouettes run slightly roomy, so we suggest going 0.5 size down for narrow feet or a snug fit, while wider feet can stay true to size. All pairs are backed by our 7-day size replacement guarantee should you need a swap. Let me know which colorway catches your eye from our live drops.`;
    }
    if (q.includes('dunk') || q.includes('jordan')) {
      return `Both our Air Jordan 1 and Dunk silhouettes fit true to size for standard feet, though SB Dunks feature a padded skate tongue that benefits from a half-size up for wide feet. Each order includes Velvet Syndicate collector cards and our 7-day size replacement guarantee. Check our live inventory to secure your UK size before the drop closes.`;
    }
    return `Most of our curated sneakers fit True to Size, though silhouettes like the Air Force 1 run slightly roomy where going 0.5 size down is ideal for narrow feet. You can shop with absolute peace of mind thanks to our 7-day size replacement guarantee. Tell me which pair you have your eye on, and I'll confirm exact UK sizing and live availability.`;
  }

  // 4. Drop / Raffle / Sunday Ballot inquiries
  if (q.includes('drop') || q.includes('raffle') || q.includes('ballot') || q.includes('sunday') || q.includes('release')) {
    return `Limited deadstock pairs are allocated through our fair ballot draw every Sunday for registered members. Gold Members enjoy a 15-minute early access window to all public drops, while Obsidian Elite status guarantees direct allocations. Keep an eye on our drops feed and register early to secure your ballot entry.`;
  }

  // 5. VIP Club / Membership inquiries
  if (q.includes('vip') || q.includes('member') || q.includes('gold') || q.includes('obsidian') || q.includes('silver')) {
    return `The Velvet Syndicate VIP Club starts at Silver tier with standard drop access and a ₹150 welcome credit. Unlock Gold Member status after just one purchase for 15-minute early drop access, or reach Obsidian Elite with 2+ purchases for guaranteed deadstock allocations and private vault releases. Every tier is designed to reward real collectors.`;
  }

  // 6. Shipping / Delivery inquiries
  if (q.includes('ship') || q.includes('deliver') || q.includes('bluedart') || q.includes('track') || q.includes('courier')) {
    return `We ship across India via BlueDart and Delhivery, delivering within 3–5 working days in secure, double-boxed packaging. Shipping is completely free on all orders over ₹1,999. You'll receive live tracking details the moment your pair clears dispatch.`;
  }

  // 7. Payment / COD inquiries
  if (q.includes('cod') || q.includes('cash on delivery') || q.includes('pay') || q.includes('upi') || q.includes('card')) {
    return `Cash on Delivery (COD) is fully supported across all serviceable pincodes in India. We also accept instant UPI via Google Pay, PhonePe, and Paytm, along with all major cards and NetBanking. Free shipping applies automatically on all orders above ₹1,999.`;
  }

  // 8. Returns / Exchange inquiries
  if (q.includes('return') || q.includes('exchange') || q.includes('replace') || q.includes('warranty')) {
    return `We provide a hassle-free 7-day size replacement guarantee on all sneaker orders. If the fit isn't spot-on, our concierge team arranges an express replacement to ensure your pair feels custom. Simply reach out within 7 days of delivery with original packaging intact.`;
  }

  // 9. Authenticity / Quality inquiries
  if (q.includes('authentic') || q.includes('real') || q.includes('original') || q.includes('quality') || q.includes('fake')) {
    return `Every pair in the Velvet Syndicate vault is crafted to premium deadstock standards with high-grade leather, exact detailing, and original brand packaging. Each shipment arrives double-boxed with official Velvet Syndicate collector cards and inspection seals. We do not compromise on street-grade craftsmanship.`;
  }

  // 10. If a matched shoe was found from general query
  if (matchedItem) {
    const priceStr = `₹${Math.round(matchedItem.price).toLocaleString('en-IN')}`;
    const sizesStr = matchedItem.sizes.length > 0 ? `UK ${matchedItem.sizes.join(', ')}` : 'current drop allocation';
    return `The ${matchedItem.name} is currently live in our catalog for ${priceStr} in sizes ${sizesStr}. It ${matchedItem.sizingAdvice.toLowerCase()}, packed in original boxing with collector cards and free shipping over ₹1,999. Would you like me to reserve your size or provide further drop details?`;
  }

  // 11. Out-of-catalog or generic query fallback
  const featured = items.slice(0, 3).map((i) => `${i.name} (₹${Math.round(i.price).toLocaleString('en-IN')})`).join(', ');
  return `Welcome to Velvet Syndicate, India's high-grade sneaker sanctuary. We're currently featuring heat like the ${featured || 'Air Jordan 1 Low Travis Scott Style and Nike SB Dunks'}. Every pair comes with our 7-day size replacement guarantee and all-India express delivery—let me know what silhouette you're hunting today.`;
}

/**
 * Dispatches to Cloudflare New API Completions Endpoint
 */
async function callCloudflareCompletions(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: string; content: string }> = []
): Promise<string> {
  const rawBaseUrl = process.env.AI_BASE_URL || env.AI_BASE_URL || 'https://smilies-weights-address-mrs.trycloudflare.com/v1';
  const baseUrl = rawBaseUrl.replace(/\/+$/, '');
  const endpoint = `${baseUrl}/chat/completions`;
  const apiKey = process.env.AI_API_KEY || env.AI_API_KEY || 'sk-cUyHnfnh4E4XHAovKV8RiWUpYn4UWr8GSceGnzCiePV1E76L';
  const model = process.env.AI_MODEL_NAME || env.AI_MODEL_NAME || 'openai/gpt-oss-20b';

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-4).map((h) => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: h.content,
    })),
    { role: 'user', content: userMessage },
  ];

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 300,
      }),
      signal: AbortSignal.timeout(9000), // 9s timeout for tunnel
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('New API Error: Upstream returned status', res.status, errText);
      throw new Error(`Upstream returned ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim();

    if (content) {
      return content;
    }

    throw new Error('Upstream response had empty content');
  } catch (err: any) {
    console.error('New API Error:', err.message || err);
    throw err;
  }
}

/**
 * Optional secondary fallback to OpenRouter if configured
 */
async function callOpenRouter(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: string; content: string }> = []
): Promise<string> {
  const apiKey = env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-4).map((h) => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: h.content,
    })),
    { role: 'user', content: userMessage },
  ];

  const models = ['google/gemini-2.5-flash', 'openai/gpt-4o-mini'];

  for (const model of models) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://velvetsyndicate.shop',
          'X-Title': 'Velvet Syndicate AI Concierge',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 250,
          temperature: 0.4,
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content?.trim();
      if (content) {
        return content;
      }
    } catch {
      // Continue to next model
    }
  }

  throw new Error('OpenRouter models failed');
}

/**
 * POST /api/ai/chat and POST /api/ai
 * Main AI Concierge chat endpoint
 */
const handleChat = async (req: Request, res: Response) => {
  let userMessage = '';
  let history: Array<{ role: string; content: string }> = [];

  try {
    if (typeof req.body?.message === 'string') {
      userMessage = req.body.message.trim();
    } else if (typeof req.body?.prompt === 'string') {
      userMessage = req.body.prompt.trim();
    } else if (typeof req.body?.query === 'string') {
      userMessage = req.body.query.trim();
    } else if (typeof req.body?.content === 'string') {
      userMessage = req.body.content.trim();
    } else if (Array.isArray(req.body?.messages)) {
      const msgs = req.body.messages;
      const lastMsg = [...msgs].reverse().find((m: any) => m && (m.role === 'user' || typeof m.content === 'string' || typeof m.text === 'string'));
      userMessage = (lastMsg?.content || lastMsg?.text || '').trim();
      history = msgs.slice(0, -1).map((m: any) => ({
        role: m.role || 'user',
        content: m.content || m.text || '',
      })).filter((m: any) => Boolean(m.content));
    } else if (typeof req.body?.messages === 'string') {
      userMessage = req.body.messages.trim();
    }

    if (Array.isArray(req.body?.history) && history.length === 0) {
      history = req.body.history;
    }
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to parse chat request body');
  }

  if (!userMessage) {
    return res.status(400).json({
      success: false,
      error: 'Message or prompt is required',
    });
  }

  // 1. Dynamic Catalog Grounding (Fetch live from DB)
  const { contextText, items } = await getLiveCatalogContext();

  // 2. Complete Store Knowledge Base in System Prompt
  const systemPrompt = buildSystemPrompt(contextText);

  let reply = '';
  let engine = 'Cipher Grounded Engine';

  // 3. Attempt upstream Cloudflare completion
  try {
    reply = await callCloudflareCompletions(systemPrompt, userMessage, history);
    engine = 'Cloudflare/gpt-oss-20b';
  } catch (err: any) {
    // 4. Secondary fallback: OpenRouter if available
    try {
      reply = await callOpenRouter(systemPrompt, userMessage, history);
      engine = 'OpenRouter/Gemini-Flash';
    } catch {
      // 5. Ultimate fallback: Cipher Grounded Local Engine
      logger.info({ reason: err.message }, 'Using Cipher Grounded Local Engine');
      reply = getCipherGroundedFallback(userMessage, items);
      engine = 'Cipher Grounded Engine (Local)';
    }
  }

  return res.json({
    success: true,
    reply,
    response: reply,
    persona: 'Cipher',
    brand: 'Velvet Syndicate',
    engine,
    catalogItemsCount: items.length,
  });
};

router.post('/chat', handleChat);
router.post('/concierge', handleChat);
router.post('/', handleChat);

/**
 * GET /api/ai/prompt
 * Returns the dynamically assembled system prompt and catalog grounding block
 */
router.get('/prompt', async (req: Request, res: Response) => {
  const forceRefresh = req.query.refresh === 'true';
  const { contextText, items } = await getLiveCatalogContext(forceRefresh);
  const prompt = buildSystemPrompt(contextText);

  return res.json({
    success: true,
    totalProducts: items.length,
    systemPrompt: prompt,
    inventoryBlock: contextText,
    persona: 'Cipher',
  });
});

/**
 * GET /api/ai/inventory
 * Returns only the dynamic live inventory block
 */
router.get('/inventory', async (req: Request, res: Response) => {
  const forceRefresh = req.query.refresh === 'true';
  const { contextText, items } = await getLiveCatalogContext(forceRefresh);

  return res.json({
    success: true,
    totalProducts: items.length,
    inventoryBlock: contextText,
    products: items,
  });
});

export default router;
