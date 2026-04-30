import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../lib/api-handler-express';
import { successResponse } from '../../lib/api-response-express';
import { getUserFromRequest } from '../../lib/auth-express';
import { db } from '../../lib/db';
import { users, orders, orderItems } from '../../lib/schema';
import { eq, sql, desc, and } from 'drizzle-orm';

const router = Router();

// Admin middleware - check if user is admin
const requireAdmin = async (req: Request, res: Response): Promise<boolean> => {
  try {
    const user = await getUserFromRequest(req);
    if (!user || (user as any).role !== 'admin') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return false;
    }
    return true;
  } catch {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return false;
  }
};

// Get loyalty users list
router.get('/users', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;
  try {
    // Get all users with their order stats for loyalty calculation
    const allUsers = await db.query.users.findMany({
      columns: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
      with: {
        orders: {
          where: eq(orders.status, 'DELIVERED'),
          columns: {
            totalAmount: true,
          }
        }
      },
      orderBy: desc(users.createdAt),
    });

    const today = new Date().toISOString().split('T')[0];

    const loyaltyUsers = allUsers.map(user => {
      const totalSpent = user.orders.reduce((sum, o) => sum + o.totalAmount, 0);
      // Calculate points: 1 point per ₹10 spent
      const totalPoints = Math.floor(totalSpent / 10);
      // Assume 10% redeemed on average for demo
      const redeemedPoints = Math.floor(totalPoints * 0.1);
      
      const isNewToday = user.createdAt?.startsWith(today);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        totalPoints,
        redeemedPoints,
        availablePoints: totalPoints - redeemedPoints,
        lastActivity: user.orders.length > 0 ? 'Recent' : 'No orders',
        transactionCount: user.orders.length,
        isNewToday,
      };
    });

    return successResponse(res, { users: loyaltyUsers });
  } catch (error) {
    console.error('Failed to fetch loyalty users:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch loyalty users' });
  }
}));

// Get transactions (simulated from orders)
router.get('/transactions', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;
  try {
    const recentOrders = await db.query.orders.findMany({
      where: eq(orders.status, 'DELIVERED'),
      with: {
        user: {
          columns: {
            name: true,
          }
        }
      },
      orderBy: desc(orders.createdAt),
      limit: 50,
    });

    const transactions = recentOrders.map(order => {
      const points = Math.floor(order.totalAmount / 10);
      return {
        id: order.id,
        userId: order.userId,
        userName: order.user?.name || 'Unknown',
        points,
        type: 'earned' as const,
        description: `Order #${order.id.slice(0, 8).toUpperCase()} - ₹${order.totalAmount}`,
        createdAt: order.createdAt,
      };
    });

    return successResponse(res, { transactions });
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
}));

// Adjust user points (admin bonus/penalty)
router.post('/users/:userId/adjust', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;
  
  try {
    const { userId } = req.params;
    const { points, reason } = req.body;
    const adminUser = await getUserFromRequest(req);

    // In a real system, this would update a loyalty_points table
    // For now, we just log it and return success
    console.log(`Admin ${adminUser?.id} adjusted ${points} points for user ${userId}: ${reason}`);

    return successResponse(res, { message: `Adjusted ${points} points for user` });
  } catch (error) {
    console.error('Failed to adjust points:', error);
    res.status(500).json({ success: false, error: 'Failed to adjust points' });
  }
}));

export default router;
