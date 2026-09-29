import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../lib/api-handler-express';
import { successResponse } from '../../lib/api-response-express';
import { getUserFromRequest } from '../../lib/auth-express';
import { db } from '../../lib/db';
import { users, orders, orderItems, products } from '../../lib/schema';
import { eq, sql, desc, and, gte, count, sum } from 'drizzle-orm';

const router = Router();

// Admin middleware - check if user is admin
const requireAdmin = async (req: Request, res: Response): Promise<boolean> => {
  try {
    const user = await getUserFromRequest(req);
    const role = (user as any)?.role;
    if (!user || (role !== 'admin' && role !== 'super_admin')) {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return false;
    }
    return true;
  } catch {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return false;
  }
};

// Get comprehensive dashboard metrics
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();
    
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    // Get all orders for calculations
    const allOrders = await db.query.orders.findMany({
      with: {
        items: {
          with: {
            product: true,
          }
        }
      },
      orderBy: desc(orders.createdAt),
    });

    const deliveredOrders = allOrders.filter(o => o.status === 'DELIVERED');
    const todayOrders = allOrders.filter(o => new Date(o.createdAt) >= today);

    // Calculate metrics
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    
    // Profit calculation (assuming 30% margin on average)
    const profitMargin = 0.30;
    const totalProfit = totalRevenue * profitMargin;
    const profitToday = todayRevenue * profitMargin;

    // User stats
    const allUsers = await db.query.users.findMany({
      columns: {
        id: true,
        createdAt: true,
      }
    });
    
    const totalUsers = allUsers.length;
    const newUsersToday = allUsers.filter(u => new Date(u.createdAt) >= today).length;

    // Orders by status
    const ordersByStatus = {
      PENDING: 0,
      CONFIRMED: 0,
      SHIPPED: 0,
      OUT_FOR_DELIVERY: 0,
      DELIVERED: 0,
      CANCELLED: 0,
      FAILED: 0,
    };
    allOrders.forEach(o => {
      if (ordersByStatus.hasOwnProperty(o.status)) {
        ordersByStatus[o.status as keyof typeof ordersByStatus]++;
      }
    });

    // Top products
    const productSales: Record<string, { name: string; sold: number; revenue: number }> = {};
    deliveredOrders.forEach(order => {
      order.items.forEach(item => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            name: item.productName,
            sold: 0,
            revenue: 0,
          };
        }
        productSales[item.productId].sold += item.quantity;
        productSales[item.productId].revenue += item.productPrice * item.quantity;
      });
    });

    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({
        id,
        name: data.name,
        totalSold: data.sold,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Sales by day (last 7 days)
    const salesByDay: Record<string, { sales: number; orders: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      salesByDay[d.toISOString().split('T')[0]] = { sales: 0, orders: 0 };
    }

    allOrders.forEach(order => {
      // Handle both SQLite CURRENT_TIMESTAMP (YYYY-MM-DD HH:MM:SS) and ISO (YYYY-MM-DDTHH:MM:SS)
      const date = order.createdAt.includes('T') ? order.createdAt.split('T')[0] : order.createdAt.split(' ')[0];
      if (salesByDay[date]) {
        salesByDay[date].sales += order.totalAmount;
        salesByDay[date].orders++;
      }
    });

    const salesByDayArray = Object.entries(salesByDay).map(([date, data]) => ({
      date,
      sales: data.sales,
      orders: data.orders,
    }));

    // Loyalty points (calculated from delivered orders)
    const totalLoyaltyPoints = Math.floor(totalRevenue / 10);
    const pointsRedeemed = Math.floor(totalLoyaltyPoints * 0.1);

    // Calculate conversion rate (orders / unique users who ordered)
    const uniqueOrderingUsers = new Set(allOrders.map(o => o.userId)).size;
    const conversionRate = totalUsers > 0 ? (uniqueOrderingUsers / totalUsers) * 100 : 0;

    // Avg order value
    const avgOrderValue = deliveredOrders.length > 0 ? totalRevenue / deliveredOrders.length : 0;

    // Sales growth (compare last 7 days to previous 7 days)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const last7DaysRevenue = allOrders
      .filter(o => new Date(o.createdAt) >= sevenDaysAgo)
      .reduce((sum, o) => sum + o.totalAmount, 0);
    
    const previous7DaysRevenue = allOrders
      .filter(o => {
        const d = new Date(o.createdAt);
        return d >= fourteenDaysAgo && d < sevenDaysAgo;
      })
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const salesGrowth = previous7DaysRevenue > 0 
      ? ((last7DaysRevenue - previous7DaysRevenue) / previous7DaysRevenue) * 100 
      : 0;

    const metrics = {
      totalUsers,
      newUsersToday,
      totalProfit,
      profitToday,
      profitMargin: profitMargin * 100,
      avgOrderValue,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      salesGrowth: parseFloat(salesGrowth.toFixed(2)),
      totalLoyaltyPoints,
      pointsRedeemed,
      topProducts,
      salesByDay: salesByDayArray,
      ordersByStatus,
    };

    return successResponse(res, { metrics });
  } catch (error) {
    console.error('Failed to fetch dashboard metrics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch metrics' });
  }
}));

export default router;
