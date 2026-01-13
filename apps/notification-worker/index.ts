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
const fromEmail = process.env.FROM_EMAIL || 'noreply@yourdomain.com';

let twilioClient: ReturnType<typeof twilio> | null = null;
if (
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_ACCOUNT_SID !== 'your-twilio-sid' &&
  process.env.TWILIO_AUTH_TOKEN !== 'your-twilio-token'
) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  console.log('Twilio client initialized for SMS notifications');
} else {
  console.warn('Twilio credentials not configured. SMS notifications will be disabled.');
}

interface NotificationJobData {
  to: string;
  phone?: string;
  asset: string;
  amount: number;
  quantity: number;
  order: string;
  type?: 'OPEN' | 'CLOSE';
}

const notificationWorker = new Worker<NotificationJobData>(
  'notifications',
  async (job: Job<NotificationJobData>) => {
    try {
      const { to, phone, asset, amount, quantity, order, type = 'OPEN' } = job.data;

      console.log(`Processing notification job ${job.id} for order ${order} (${type})`);

      const { subject, text, html } = emailTemplate(asset, amount, quantity, order);

      try {
        await resend.emails.send({
          from: fromEmail,
          to,
          subject,
          html,
          text,
        });
        console.log(`Email sent successfully to ${to}`);
      } catch (emailError) {
        console.error(`Failed to send email to ${to}:`, emailError);
      }

      // Send SMS notification only if phone number is provided and Twilio is configured
      if (twilioClient && phone) {
        try {
          const body = smsTemplete(asset, amount, quantity, order);
          await twilioClient.messages.create({
            body,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone,
          });
          console.log(`SMS sent successfully to ${phone}`);
        } catch (smsError) {
          console.error(`Failed to send SMS to ${phone}:`, smsError);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error processing notification job:', error);
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
