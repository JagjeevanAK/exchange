import { notificationConfig, redisConfig } from '@exchange/config';
import { createRedisClient } from '@exchange/redis';
import { Worker, type Job } from 'bullmq';
import { Resend } from 'resend';
import twilio from 'twilio';
import { smsTemplete } from './templetes/smsTemplete';
import { emailTemplate } from './templetes/emailTemplete';

const redisConnection = createRedisClient();

const resend = new Resend(notificationConfig.resendApiKey);
const fromEmail = notificationConfig.fromEmail;

let twilioClient: ReturnType<typeof twilio> | null = null;
if (
  notificationConfig.twilioAccountSid &&
  notificationConfig.twilioAuthToken &&
  notificationConfig.twilioAccountSid !== 'your-twilio-sid' &&
  notificationConfig.twilioAuthToken !== 'your-twilio-token'
) {
  twilioClient = twilio(notificationConfig.twilioAccountSid, notificationConfig.twilioAuthToken);
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
