import { env } from './env';
import { logger } from './logger';

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// Email templates
const templates: Record<string, (data: Record<string, unknown>) => EmailTemplate> = {
  signup: (data) => ({
    subject: 'Welcome to Velvet Syndicate',
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">Welcome to Velvet Syndicate</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          Hi ${data.name || 'there'},
        </p>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          Thank you for joining Velvet Syndicate. Your account has been successfully created.
        </p>
        <div style="margin: 30px 0; padding: 20px; background: #f5f5f5; border-radius: 8px;">
          <p style="margin: 0; color: #666; font-size: 14px;">
            <strong>Email:</strong> ${data.email}
          </p>
        </div>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          Start exploring our collection of luxury footwear designed for those who appreciate the art of subtlety.
        </p>
        <a href="${env.APP_URL}/shop" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #1a1a1a; color: white; text-decoration: none; border-radius: 4px; font-size: 14px;">
          Explore Collection
        </a>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 40px 0;" />
        <p style="color: #999; font-size: 12px; line-height: 1.5;">
          This email was sent by Velvet Syndicate. If you didn't create an account, please ignore this email.
        </p>
      </div>
    `,
    text: `Welcome to Velvet Syndicate!

Hi ${data.name || 'there'},

Thank you for joining Velvet Syndicate. Your account has been successfully created.

Email: ${data.email}

Start exploring our collection at ${env.APP_URL}/shop

If you didn't create an account, please ignore this email.`,
  }),

  orderConfirmation: (data) => {
    const items = (data.items as Array<{ name: string; quantity: number; price: number }>) || [];
    const itemsList = items.map(item =>
      `<tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5; color: #4a4a4a;">${item.name}</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5; text-align: center; color: #4a4a4a;">${item.quantity}</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5; text-align: right; color: #4a4a4a;">$${item.price.toFixed(2)}</td>
      </tr>`
    ).join('');

    const itemsText = items.map(item =>
      `- ${item.name} x${item.quantity} - $${item.price.toFixed(2)}`
    ).join('\n');

    return {
      subject: `Order Confirmation #${data.orderId}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">Order Confirmed</h1>
          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
            Thank you for your order. We're preparing your items with care.
          </p>
          <div style="margin: 30px 0; padding: 20px; background: #f5f5f5; border-radius: 8px;">
            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
              <strong>Order ID:</strong> ${data.orderId}
            </p>
            <p style="margin: 0; color: #666; font-size: 14px;">
              <strong>Order Date:</strong> ${new Date().toLocaleDateString()}
            </p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="border-bottom: 2px solid #1a1a1a;">
                <th style="padding: 12px 0; text-align: left; font-size: 12px; color: #999; text-transform: uppercase;">Item</th>
                <th style="padding: 12px 0; text-align: center; font-size: 12px; color: #999; text-transform: uppercase;">Qty</th>
                <th style="padding: 12px 0; text-align: right; font-size: 12px; color: #999; text-transform: uppercase;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 20px 0; text-align: right; font-weight: 600; color: #1a1a1a;">Total:</td>
                <td style="padding: 20px 0; text-align: right; font-weight: 600; color: #1a1a1a;">$${(data.total as number || 0).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
            We'll send you another email when your order ships.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 40px 0;" />
          <p style="color: #999; font-size: 12px; line-height: 1.5;">
            Questions? Reply to this email or contact us at support@velvetsyndicate.com
          </p>
        </div>
      `,
      text: `Order Confirmation #${data.orderId}

Thank you for your order!

Order ID: ${data.orderId}
Order Date: ${new Date().toLocaleDateString()}

Items:
${itemsText}

Total: $${(data.total as number || 0).toFixed(2)}

We'll send you another email when your order ships.

Questions? Contact us at support@velvetsyndicate.com`,
    };
  },

  passwordReset: (data) => ({
    subject: 'Reset Your Password',
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">Reset Your Password</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          We received a request to reset your password. Click the button below to create a new password.
        </p>
        <a href="${data.resetUrl}" style="display: inline-block; margin: 20px 0; padding: 12px 24px; background: #1a1a1a; color: white; text-decoration: none; border-radius: 4px; font-size: 14px;">
          Reset Password
        </a>
        <p style="color: #4a4a4a; font-size: 14px; line-height: 1.6;">
          This link will expire in 1 hour. If you didn't request this reset, please ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 40px 0;" />
        <p style="color: #999; font-size: 12px; line-height: 1.5;">
          If the button doesn't work, copy and paste this link: ${data.resetUrl}
        </p>
      </div>
    `,
    text: `Reset Your Password

We received a request to reset your password. Click the link below to create a new password:

${data.resetUrl}

This link will expire in 1 hour. If you didn't request this reset, please ignore this email.`,
  }),
};

// Send email using Resend
export async function sendEmail(
  to: string,
  templateName: keyof typeof templates,
  data: Record<string, unknown>
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!env.RESEND_API_KEY) {
    // Log email in development
    if (env.NODE_ENV === 'development') {
      logger.info({ to, template: templateName, data }, 'Email would be sent (development)');
      return { success: true, id: 'dev-' + Date.now() };
    }
    return { success: false, error: 'Email service not configured' };
  }

  const template = templates[templateName];
  if (!template) {
    return { success: false, error: `Unknown template: ${templateName}` };
  }

  const { subject, html, text } = template(data);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to,
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const result = await response.json() as { id: string };

    logger.info({ to, template: templateName, emailId: result.id }, 'Email sent successfully');

    return { success: true, id: result.id };
  } catch (err) {
    const errorMessage = (err as Error).message;
    logger.error({ err, to, template: templateName }, 'Failed to send email');
    return { success: false, error: errorMessage };
  }
}

// Bulk email with rate limiting
export async function sendBulkEmail(
  recipients: string[],
  templateName: keyof typeof templates,
  data: Record<string, unknown>,
  options: { batchSize?: number; delayMs?: number } = {}
): Promise<{ success: boolean; sent: number; failed: number; errors: string[] }> {
  const { batchSize = 10, delayMs = 1000 } = options;
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map((to) => sendEmail(to, templateName, data))
    );

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.success) {
        sent++;
      } else {
        failed++;
        errors.push(result.status === 'rejected' ? result.reason : result.value.error || 'Unknown error');
      }
    });

    // Delay between batches to avoid rate limits
    if (i + batchSize < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  logger.info({ sent, failed, total: recipients.length }, 'Bulk email completed');

  return { success: failed === 0, sent, failed, errors };
}

// Validate email address format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Sanitize email data
export function sanitizeEmailData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      // Remove HTML tags and limit length
      sanitized[key] = value
        .replace(/<[^>]*>/g, '')
        .slice(0, 1000);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
