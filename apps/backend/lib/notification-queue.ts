import { Queue } from 'bullmq';
import Redis from 'ioredis';

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const notificationQueue = new Queue('notifications', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export interface NotificationData {
  to: string;
  phone?: string;
  asset: string;
  amount: number;
  quantity: number;
  order: string;
  type?:
    | 'OPEN'
    | 'CLOSE'
    | 'PENDING'
    | 'CANCELLED'
    | 'LIMIT_EXECUTED'
    | 'TP_TRIGGERED'
    | 'SL_TRIGGERED';
}

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

export default notificationQueue;
