import { db } from '../lib/db';
import {
  addresses,
  cart,
  cartItems,
  events,
  feedback,
  orderIntents,
  orderItems,
  orders,
  otpVerifications,
  passwordResetTokens,
  sessions,
  users,
} from '../lib/schema';
import { ne } from 'drizzle-orm';
import { logger } from '../lib/logger';

async function runWipe() {
  logger.info('Starting Production Wipe...');

  try {
    // 1. Clear Orders and Carts
    logger.info('Clearing order intents...');
    await db.delete(orderIntents);
    logger.info('Clearing order items...');
    await db.delete(orderItems);
    logger.info('Clearing orders...');
    await db.delete(orders);
    logger.info('Clearing cart items...');
    await db.delete(cartItems);
    logger.info('Clearing carts...');
    await db.delete(cart);

    // 2. Clear Auth & Sessions
    logger.info('Clearing sessions...');
    await db.delete(sessions);
    logger.info('Clearing password reset tokens...');
    await db.delete(passwordResetTokens);
    logger.info('Clearing OTP verifications...');
    await db.delete(otpVerifications);

    // 3. Clear Analytics & Feedback
    logger.info('Clearing events (analytics)...');
    await db.delete(events);
    logger.info('Clearing feedback...');
    await db.delete(feedback);

    // 4. Clear Users & Addresses (Except Admin)
    logger.info('Clearing addresses...');
    await db.delete(addresses);
    
    logger.info('Clearing test users...');
    // Delete all users except the admin
    await db.delete(users).where(ne(users.role, 'admin'));

    logger.info('✅ Production Wipe Complete. Database is ready for launch!');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, '❌ Production Wipe Failed');
    process.exit(1);
  }
}

runWipe();
