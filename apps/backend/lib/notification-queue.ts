import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Redis configuration
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Create notification queue
const notificationQueue = new Queue('notifications', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 second delay
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 200, // Keep last 200 failed jobs
  },
});

// Interface for notification data
export interface NotificationData {
  to: string;
  asset: string;
  amount: number;
  quantity: number;
  order: string;
}

// Function to send notification
export const sendNotification = async (data: NotificationData) => {
  try {
    const job = await notificationQueue.add('send-notification', data, {
      removeOnComplete: true,
      removeOnFail: false,
    });

    console.log(`Notification job ${job.id} added to queue for order ${data.order}`);
    return job;
  } catch (error) {
    console.error('Error adding notification to queue:', error);
    throw error;
  }
};

// Export queue for monitoring/debugging purposes
export default notificationQueue;
