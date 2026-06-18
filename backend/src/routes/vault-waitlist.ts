import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { asyncHandler } from '../lib/api-handler-express';
import { successResponse } from '../lib/api-response-express';
import { ConflictError, ValidationError } from '../lib/errors';
import { dbClient } from '../lib/db';

const router = Router();

const waitlistSchema = z.object({
  email: z.string().email('Valid email is required'),
});

// POST /api/vault/waitlist
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { email } = waitlistSchema.parse(req.body);
  const normalisedEmail = email.toLowerCase().trim();

  // Check for duplicate
  const existing = await dbClient.execute({
    sql: 'SELECT id FROM vault_waitlist WHERE email = ?',
    args: [normalisedEmail],
  });

  if (existing.rows.length > 0) {
    throw new ConflictError('This email is already on the waitlist.');
  }

  // Insert new entry
  await dbClient.execute({
    sql: 'INSERT INTO vault_waitlist (id, email) VALUES (?, ?)',
    args: [crypto.randomUUID(), normalisedEmail],
  });

  return successResponse(res, {
    message: "You're on the list. We'll notify you when Velvet Vault unlocks.",
  });
}));

export default router;