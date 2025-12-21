// Example: How to use the notification queue in your backend routes

import { sendNotification } from '../lib/notification-queue';

// Example 1: Send notification after trade execution
async function handleTradeExecution(userId: string, email: string, tradeData: any) {
  try {
    // Execute trade logic...
    const trade = await executeTrade(tradeData);

    // Send notification
    await sendNotification({
      to: email,
      asset: trade.asset,
      amount: trade.amount,
      quantity: trade.quantity,
      order: trade.id,
    });

    return { success: true, orderId: trade.id };
  } catch (error) {
    console.error('Trade execution failed:', error);
    throw error;
  }
}

// Example 2: Send notification without blocking the response
async function handleTradeExecutionAsync(userId: string, email: string, tradeData: any) {
  try {
    // Execute trade logic...
    const trade = await executeTrade(tradeData);

    // Send notification asynchronously (fire and forget)
    sendNotification({
      to: email,
      asset: trade.asset,
      amount: trade.amount,
      quantity: trade.quantity,
      order: trade.id,
    }).catch((err) => {
      // Log error but don't fail the request
      console.error('Failed to queue notification:', err);
    });

    // Return immediately without waiting for notification
    return { success: true, orderId: trade.id };
  } catch (error) {
    console.error('Trade execution failed:', error);
    throw error;
  }
}

// Example 3: Batch notifications
async function sendBatchNotifications(
  notifications: Array<{
    to: string;
    asset: string;
    amount: number;
    quantity: number;
    order: string;
  }>
) {
  const results = await Promise.allSettled(
    notifications.map((notification) => sendNotification(notification))
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  console.log(`Notifications: ${succeeded} queued, ${failed} failed`);

  return { succeeded, failed };
}

// Example 4: Monitor queue status
import notificationQueue from '../lib/notification-queue';

async function getQueueStats() {
  const counts = await notificationQueue.getJobCounts();

  return {
    waiting: counts.waiting,
    active: counts.active,
    completed: counts.completed,
    failed: counts.failed,
    delayed: counts.delayed,
  };
}

// Example 5: Get failed jobs for debugging
async function getFailedNotifications() {
  const failed = await notificationQueue.getFailed(0, 10); // Get first 10 failed jobs

  return failed.map((job) => ({
    id: job.id,
    data: job.data,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
    timestamp: job.timestamp,
  }));
}

// Example 6: Retry a failed job
async function retryFailedNotification(jobId: string) {
  const job = await notificationQueue.getJob(jobId);

  if (job && (await job.isFailed())) {
    await job.retry();
    return { success: true, message: 'Job queued for retry' };
  }

  return { success: false, message: 'Job not found or not failed' };
}

// Helper function (mock)
async function executeTrade(tradeData: any) {
  // Your trade execution logic here
  return {
    id: 'trade-123',
    asset: tradeData.asset,
    amount: tradeData.amount,
    quantity: tradeData.quantity,
  };
}

export {
  handleTradeExecution,
  handleTradeExecutionAsync,
  sendBatchNotifications,
  getQueueStats,
  getFailedNotifications,
  retryFailedNotification,
};
