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
