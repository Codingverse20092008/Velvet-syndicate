import { env } from './env';
import { logger } from './logger';

/**
 * 🚨 ALERTING SERVICE
 * Dispatches critical system alerts to Slack/Discord webhooks.
 */
export async function sendAlert(message: string, context: any = {}) {
  const webhookUrl = env.ALERT_WEBHOOK_URL;
  
  if (!webhookUrl) {
    logger.warn({ message, context }, 'Alert triggered but no ALERT_WEBHOOK_URL configured');
    return;
  }

  try {
    const payload = {
      content: `🚨 **SYSTEM ALERT** 🚨\n**Message:** ${message}\n**Environment:** ${process.env.NODE_ENV}\n**Context:** \`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\``
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook responded with ${response.status}`);
    }

    logger.info({ message }, 'Alert successfully dispatched to webhook');
  } catch (err) {
    logger.error({ err, message }, 'Failed to dispatch alert to webhook');
  }
}
