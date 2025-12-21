import { Worker, type Job } from 'bullmq';
import Redis from 'ioredis';
import { Resend } from 'resend';
import twilio from 'twilio';
import { smsTemplete } from './templetes/smsTemplete';
import { emailTemplate } from './templetes/emailTemplete';

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const resend = new Resend(process.env.RESEND_API_KEY as string);

let client: any = null;
if (
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_ACCOUNT_SID !== 'your-twilio-sid' &&
  process.env.TWILIO_AUTH_TOKEN !== 'your-twilio-token'
) {
  client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
} else {
  console.warn('Twilio credentials not configured. SMS notifications will be disabled.');
}

interface NotificationJobData {
  to: string;
  asset: string;
  amount: number;
  quantity: number;
  order: string;
}

const notificationWorker = new Worker<NotificationJobData>(
  'notifications',
  async (job: Job<NotificationJobData>) => {
    try {
      const { to, asset, amount, quantity, order } = job.data;

      console.log(`Processing notification job ${job.id} for order ${order}`);

      const { subject, text, html } = emailTemplate(asset, amount, quantity, order);

      await resend.emails.send({
        from: 'noreply@yourdomain.com',
        to,
        subject,
        html,
        text,
      });

      console.log(`Email sent successfully to ${to}`);

      if (client) {
        const body = smsTemplete(asset, amount, quantity, order);
        await client.messages.create({
          body,
          from: process.env.TWILIO_PHONE_NUMBER,
          to,
        });
        console.log(`SMS sent successfully to ${to}`);
      } else {
        console.log('SMS not sent - Twilio not configured');
      }

      return { success: true };
    } catch (error) {
      console.error('Error while sending Email and SMS:', error);
      throw error; 
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  }
);

// Event listeners for worker
notificationWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

notificationWorker.on('error', (err) => {
  console.error('Worker error:', err);
});

console.log('Notification worker started and waiting for jobs...');

process.on('SIGINT', async () => {
  console.log('Shutting down notification worker...');
  await notificationWorker.close();
  await redisConnection.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down notification worker...');
  await notificationWorker.close();
  await redisConnection.quit();
  process.exit(0);
});
