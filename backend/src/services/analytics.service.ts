import { db } from '../lib/db';
import { orders, orderItems, users, events, products } from '../lib/schema';
import { eq, sql, and, desc } from 'drizzle-orm';
import { logger } from '../lib/logger';

export async function getAnalyticsOverview() {
  try {
    // Total Users
    const [totalUsersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    const totalUsers = totalUsersResult?.count || 0;

    // Total Orders
    const [totalOrdersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders);
    const totalOrders = totalOrdersResult?.count || 0;

    // Total Revenue (only PAID or DELIVERED orders)
    const [revenueResult] = await db
      .select({ total: sql<number>`coalesce(sum(${orders.totalAmount}), 0)` })
      .from(orders)
      .where(sql`${orders.status} IN ('CONFIRMED', 'SHIPPED', 'DELIVERED')`);
    const totalRevenue = revenueResult?.total || 0;

    // Conversion Rate: ORDER_CREATED / CHECKOUT_STARTED
    const [checkoutStartedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(events)
      .where(eq(events.eventType, 'CHECKOUT_STARTED'));

    const [orderCreatedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(events)
      .where(eq(events.eventType, 'ORDER_CREATED'));

    const checkoutStarted = checkoutStartedResult?.count || 0;
    const orderCreated = orderCreatedResult?.count || 0;
    const conversionRate = checkoutStarted > 0 ? (orderCreated / checkoutStarted) * 100 : 0;

    // Top Products (most ordered)
    const topProducts = await db
      .select({
        productId: orderItems.productId,
        productName: orderItems.productName,
        totalOrdered: sql<number>`sum(${orderItems.quantity})`,
        revenue: sql<number>`sum(${orderItems.productPrice} * ${orderItems.quantity})`,
      })
      .from(orderItems)
      .groupBy(orderItems.productId, orderItems.productName)
      .orderBy(desc(sql`sum(${orderItems.quantity})`))
      .limit(5);

    // Repeat Users (users with >1 order)
    const [repeatUsersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(
        sql`(SELECT ${orders.userId} FROM ${orders} GROUP BY ${orders.userId} HAVING count(*) > 1)`
      );
    const repeatUsers = repeatUsersResult?.count || 0;
    const repeatUserRate = totalUsers > 0 ? (repeatUsers / totalUsers) * 100 : 0;

    // Average Order Value
    const [avgOrderResult] = await db
      .select({ avg: sql<number>`coalesce(avg(${orders.totalAmount}), 0)` })
      .from(orders);
    const avgOrderValue = avgOrderResult?.avg || 0;

    // Recent Events Count (last 7 days approx)
    const [recentEventsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(events)
      .where(sql`${events.createdAt} >= datetime('now', '-7 days')`);
    const recentEvents = recentEventsResult?.count || 0;

    // Event breakdown
    const eventBreakdown = await db
      .select({
        eventType: events.eventType,
        count: sql<number>`count(*)`,
      })
      .from(events)
      .groupBy(events.eventType)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    return {
      totalUsers,
      totalOrders,
      totalRevenue,
      conversionRate: Math.round(conversionRate * 100) / 100,
      topProducts,
      repeatUsers,
      repeatUserRate: Math.round(repeatUserRate * 100) / 100,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      recentEvents,
      eventBreakdown,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to generate analytics overview');
    throw error;
  }
}

export async function getFunnelAnalytics() {
  try {
    const funnelStages = ['VIEW_PRODUCT', 'ADD_TO_CART', 'CHECKOUT_STARTED', 'ORDER_CREATED'] as const;

    const counts: Record<string, number> = {};
    for (const stage of funnelStages) {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(events)
        .where(eq(events.eventType, stage));
      counts[stage] = result?.count || 0;
    }

    const views = counts['VIEW_PRODUCT'];
    const addToCart = counts['ADD_TO_CART'];
    const checkoutStarted = counts['CHECKOUT_STARTED'];
    const orders = counts['ORDER_CREATED'];

    const viewToCartRate = views > 0 ? (addToCart / views) * 100 : 0;
    const cartToCheckoutRate = addToCart > 0 ? (checkoutStarted / addToCart) * 100 : 0;
    const checkoutToOrderRate = checkoutStarted > 0 ? (orders / checkoutStarted) * 100 : 0;
    const overallConversionRate = views > 0 ? (orders / views) * 100 : 0;

    // Identify biggest drop-off
    const dropoffs = [
      { stage: 'VIEW_PRODUCT → ADD_TO_CART', rate: viewToCartRate, dropoff: views - addToCart },
      { stage: 'ADD_TO_CART → CHECKOUT_STARTED', rate: cartToCheckoutRate, dropoff: addToCart - checkoutStarted },
      { stage: 'CHECKOUT_STARTED → ORDER_CREATED', rate: checkoutToOrderRate, dropoff: checkoutStarted - orders },
    ];
    const biggestDropoff = dropoffs.reduce((worst, curr) =>
      curr.rate < worst.rate ? curr : worst
    , { stage: '', rate: 100, dropoff: 0 });

    // Generate actionable insights
    const insights = generateInsights(viewToCartRate, cartToCheckoutRate, checkoutToOrderRate);

    return {
      views,
      addToCart,
      checkoutStarted,
      orders,
      viewToCartRate: Math.round(viewToCartRate * 100) / 100,
      cartToCheckoutRate: Math.round(cartToCheckoutRate * 100) / 100,
      checkoutToOrderRate: Math.round(checkoutToOrderRate * 100) / 100,
      overallConversionRate: Math.round(overallConversionRate * 100) / 100,
      biggestDropoff: {
        ...biggestDropoff,
        rate: Math.round(biggestDropoff.rate * 100) / 100,
      },
      insights,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to generate funnel analytics');
    throw error;
  }
}

function generateInsights(viewToCart: number, cartToCheckout: number, checkoutToOrder: number) {
  const insights: { stage: string; severity: 'critical' | 'warning' | 'good'; recommendations: string[] }[] = [];

  // View → Cart analysis
  if (viewToCart < 10) {
    insights.push({
      stage: 'VIEW_PRODUCT → ADD_TO_CART',
      severity: 'critical',
      recommendations: [
        'Improve product images — add zoom and multiple angles',
        'Add trust badges (secure payment, easy returns)',
        'Show urgency signals ("Only 3 left in stock")',
        'Display social proof ("12 people bought this today")',
        'Add size guide and fit recommendations',
      ],
    });
  } else if (viewToCart < 25) {
    insights.push({
      stage: 'VIEW_PRODUCT → ADD_TO_CART',
      severity: 'warning',
      recommendations: [
        'A/B test CTA text ("Add to Cart" vs "Select Size to Add")',
        'Show price comparison or value proposition',
        'Add customer reviews prominently',
      ],
    });
  } else {
    insights.push({
      stage: 'VIEW_PRODUCT → ADD_TO_CART',
      severity: 'good',
      recommendations: ['Maintain current product page quality'],
    });
  }

  // Cart → Checkout analysis
  if (cartToCheckout < 30) {
    insights.push({
      stage: 'ADD_TO_CART → CHECKOUT_STARTED',
      severity: 'critical',
      recommendations: [
        'Simplify cart UI — reduce visual clutter',
        'Show clear total with no hidden charges',
        'Add "Proceed to Checkout" as primary CTA',
        'Remove distractions in cart drawer',
        'Show estimated delivery date in cart',
      ],
    });
  } else if (cartToCheckout < 60) {
    insights.push({
      stage: 'ADD_TO_CART → CHECKOUT_STARTED',
      severity: 'warning',
      recommendations: [
        'Highlight free shipping threshold',
        'Add "Items reserved for 10 min" urgency',
        'Show saved amount or discount in cart',
      ],
    });
  } else {
    insights.push({
      stage: 'ADD_TO_CART → CHECKOUT_STARTED',
      severity: 'good',
      recommendations: ['Cart to checkout flow is healthy'],
    });
  }

  // Checkout → Order analysis
  if (checkoutToOrder < 50) {
    insights.push({
      stage: 'CHECKOUT_STARTED → ORDER_CREATED',
      severity: 'critical',
      recommendations: [
        'Simplify checkout form — reduce fields',
        'Highlight COD benefit ("Pay on delivery, no risk")',
        'Add trust messaging near CTA ("Secure checkout")',
        'Show order summary clearly before confirming',
        'Reduce page load time on checkout',
      ],
    });
  } else if (checkoutToOrder < 75) {
    insights.push({
      stage: 'CHECKOUT_STARTED → ORDER_CREATED',
      severity: 'warning',
      recommendations: [
        'A/B test CTA text ("Place Order" vs "Complete Your Order")',
        'Add progress indicator in checkout',
        'Show delivery estimate prominently',
      ],
    });
  } else {
    insights.push({
      stage: 'CHECKOUT_STARTED → ORDER_CREATED',
      severity: 'good',
      recommendations: ['Checkout conversion is strong'],
    });
  }

  return insights;
}

export async function getProductInsights() {
  try {
    // Most viewed products
    const mostViewed = await db
      .select({
        productId: sql<string>`json_extract(${events.metadata}, '$.productId')`,
        views: sql<number>`count(*)`,
      })
      .from(events)
      .where(eq(events.eventType, 'VIEW_PRODUCT'))
      .groupBy(sql`json_extract(${events.metadata}, '$.productId')`)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Most added to cart
    const mostCarted = await db
      .select({
        productId: sql<string>`json_extract(${events.metadata}, '$.productId')`,
        addToCart: sql<number>`count(*)`,
      })
      .from(events)
      .where(eq(events.eventType, 'ADD_TO_CART'))
      .groupBy(sql`json_extract(${events.metadata}, '$.productId')`)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Most ordered (from order items)
    const mostOrdered = await db
      .select({
        productId: orderItems.productId,
        productName: orderItems.productName,
        orders: sql<number>`sum(${orderItems.quantity})`,
        revenue: sql<number>`sum(${orderItems.productPrice} * ${orderItems.quantity})`,
      })
      .from(orderItems)
      .groupBy(orderItems.productId, orderItems.productName)
      .orderBy(desc(sql`sum(${orderItems.quantity})`))
      .limit(10);

    // Merge view + cart + order data per product
    const productMap = new Map<string, {
      productId: string;
      productName: string | null;
      views: number;
      addToCart: number;
      orders: number;
      revenue: number;
      viewToCartRate: number;
      cartToOrderRate: number;
    }>();

    for (const v of mostViewed) {
      if (!v.productId) continue;
      productMap.set(v.productId, {
        productId: v.productId,
        productName: null,
        views: v.views,
        addToCart: 0,
        orders: 0,
        revenue: 0,
        viewToCartRate: 0,
        cartToOrderRate: 0,
      });
    }

    for (const c of mostCarted) {
      if (!c.productId) continue;
      const existing = productMap.get(c.productId) || {
        productId: c.productId,
        productName: null,
        views: 0,
        addToCart: 0,
        orders: 0,
        revenue: 0,
        viewToCartRate: 0,
        cartToOrderRate: 0,
      };
      existing.addToCart = c.addToCart;
      productMap.set(c.productId, existing);
    }

    for (const o of mostOrdered) {
      const existing = productMap.get(o.productId) || {
        productId: o.productId,
        productName: null,
        views: 0,
        addToCart: 0,
        orders: 0,
        revenue: 0,
        viewToCartRate: 0,
        cartToOrderRate: 0,
      };
      existing.productName = o.productName;
      existing.orders = o.orders;
      existing.revenue = o.revenue;
      productMap.set(o.productId, existing);
    }

    // Calculate per-product conversion rates and tag insights
    const productInsights = Array.from(productMap.values()).map(p => {
      const viewToCartRate = p.views > 0 ? (p.addToCart / p.views) * 100 : 0;
      const cartToOrderRate = p.addToCart > 0 ? (p.orders / p.addToCart) * 100 : 0;

      let tag: 'problem' | 'opportunity' | 'star' | 'neutral' = 'neutral';
      if (p.views > 5 && viewToCartRate < 15) tag = 'problem'; // high view, low conversion
      else if (p.views < 5 && cartToOrderRate > 50) tag = 'opportunity'; // low view, high conversion
      else if (viewToCartRate > 25 && cartToOrderRate > 50) tag = 'star'; // both high

      return {
        ...p,
        viewToCartRate: Math.round(viewToCartRate * 100) / 100,
        cartToOrderRate: Math.round(cartToOrderRate * 100) / 100,
        tag,
      };
    });

    // Sort by views desc
    productInsights.sort((a, b) => b.views - a.views);

    return { products: productInsights };
  } catch (error) {
    logger.error({ error }, 'Failed to generate product insights');
    throw error;
  }
}
