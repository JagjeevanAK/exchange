import axios from 'axios';

// Backend server configuration
const endpoint = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: endpoint,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important: This sends cookies with requests
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Response interceptor for handling token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip refresh attempt for the refresh endpoint itself or if already retried
    if (originalRequest.url?.includes('/refresh') || originalRequest._retry) {
      return Promise.reject(error);
    }

    // If error is 401/403 and we haven't tried refreshing yet
    if (error.response?.status === 401 || error.response?.status === 403) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh the token
        await apiClient.post('/api/v1/user/refresh');
        processQueue();
        isRefreshing = false;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        isRefreshing = false;
        // Don't redirect on every 401 - let the component handle it
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export const api = {
  signin: async (email: string, password: string) => {
    try {
      const res = await apiClient.post('/api/v1/user/signin', {
        email,
        password,
      });
      return res.data;
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      throw new Error(axiosError.response?.data?.message || 'Signin failed');
    }
  },

  // Google Sign-in - redirects to backend OAuth endpoint
  signinWithGoogle: () => {
    const googleAuthUrl = `${endpoint}/api/v1/auth/google`;
    window.location.href = googleAuthUrl;
  },

  signup: async (email: string, password: string) => {
    try {
      const res = await apiClient.post('/api/v1/user/signup', {
        email,
        password,
      });
      return res.data;
    } catch (e: unknown) {
      const error = e as { response?: { data?: { message?: string } } };
      throw new Error(error.response?.data?.message || 'Signup failed');
    }
  },

  logout: async () => {
    try {
      await apiClient.post('/api/v1/user/logout');
      return { message: 'Logged out successfully' };
    } catch {
      // Even if logout fails on server, consider it successful on client
      return { message: 'Logged out successfully' };
    }
  },

  // Check if user is authenticated (uses cookie)
  checkAuth: async () => {
    try {
      const res = await apiClient.get('/api/v1/user/me');
      return res.data;
    } catch (error) {
      // 401 errors are expected when user is not authenticated
      return { authenticated: false, user: null };
    }
  },

  // Refresh token
  refreshToken: async () => {
    try {
      const res = await apiClient.post('/api/v1/user/refresh');
      return res.data;
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      throw new Error(axiosError.response?.data?.message || 'Token refresh failed');
    }
  },

  balance: async () => {
    try {
      const res = await apiClient.get('/api/v1/user/balance');
      return res.data;
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      throw new Error(axiosError.response?.data?.message || 'Failed to fetch balance');
    }
  },

  // Asset-related APIs
  getAssets: async () => {
    try {
      const res = await apiClient.get('/api/v1/assets');
      return res.data;
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      throw new Error(axiosError.response?.data?.message || 'Failed to fetch assets');
    }
  },

  // Candles/Chart data APIs
  getCandles: async (asset: string, timeframe: string, startTime?: number, endTime?: number) => {
    try {
      // Default to last 24 hours if no time range provided
      const now = Math.floor(Date.now() / 1000);
      const defaultStartTime = now - 24 * 60 * 60; // 24 hours ago

      const params = new URLSearchParams({
        asset: asset,
        ts: timeframe,
        startTime: (startTime || defaultStartTime).toString(),
        endTime: (endTime || now).toString(),
      });

      const res = await apiClient.get(`/api/v1/candles?${params}`);
      return res.data;
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      throw new Error(axiosError.response?.data?.message || 'Failed to fetch candles');
    }
  },

  // Get latest candle for real-time updates
  getLatestCandle: async (asset: string, timeframe: string = '1m') => {
    try {
      const params = new URLSearchParams({
        asset: asset,
        ts: timeframe,
      });

      const res = await apiClient.get(`/api/v1/candles/latest?${params}`);
      return res.data;
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      throw new Error(axiosError.response?.data?.message || 'Failed to fetch latest candle');
    }
  },

  // Trading APIs
  placeTrade: async (tradeData: {
    asset: string;
    type: 'BUY' | 'SELL' | 'LONG' | 'SHORT';
    margin: number;
    leverage: number;
    orderType?: 'MARKET' | 'LIMIT';
    limitPrice?: number;
    takeProfitPrice?: number;
    stopLossPrice?: number;
  }) => {
    try {
      const res = await apiClient.post('/api/v1/trade', tradeData);
      return res.data;
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      throw new Error(axiosError.response?.data?.message || 'Failed to place trade');
    }
  },

  closeTrade: async (tradeId: string) => {
    try {
      const res = await apiClient.post(`/api/v1/trades/${tradeId}/close`);
      return res.data;
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      throw new Error(axiosError.response?.data?.message || 'Failed to close trade');
    }
  },

  getOpenTrades: async () => {
    try {
      const res = await apiClient.get('/api/v1/trades/open');
      return res.data;
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      throw new Error(axiosError.response?.data?.message || 'Failed to fetch open trades');
    }
  },

  getClosedTrades: async () => {
    try {
      const res = await apiClient.get('/api/v1/trades/closed');
      return res.data;
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      throw new Error(axiosError.response?.data?.message || 'Failed to fetch closed trades');
    }
  },

  // Pending/Limit order APIs
  getPendingOrders: async () => {
    try {
      const res = await apiClient.get('/api/v1/orders/pending');
      return res.data;
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      throw new Error(axiosError.response?.data?.message || 'Failed to fetch pending orders');
    }
  },

  cancelOrder: async (orderId: string) => {
    try {
      const res = await apiClient.delete(`/api/v1/orders/${orderId}`);
      return res.data;
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      throw new Error(axiosError.response?.data?.message || 'Failed to cancel order');
    }
  },

  modifyOrder: async (
    orderId: string,
    data: { limitPrice?: number; takeProfitPrice?: number; stopLossPrice?: number }
  ) => {
    try {
      const res = await apiClient.put(`/api/v1/orders/${orderId}`, data);
      return res.data;
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      throw new Error(axiosError.response?.data?.message || 'Failed to modify order');
    }
  },
};
