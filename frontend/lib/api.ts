import axios from "axios";

// Backend server configuration
const endpoint = process.env.NODE_ENV === "production" 
    ? process.env.NEXT_PUBLIC_BACKEND_URL || "https://your-production-api.com"
    : "http://localhost:3001";

// Create axios instance with default configuration
const apiClient = axios.create({
    baseURL: endpoint,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // For CORS credentials
});

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid, redirect to login
            removeAuthToken();
            if (typeof window !== 'undefined') {
                window.location.href = '/signin';
            }
        }
        return Promise.reject(error);
    }
);

const getAuthToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('token');
    }
    return null;
};

const setAuthToken = (token: string): void => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
    }
};

const removeAuthToken = (): void => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
    }
};

export const api = {
    signin: async (email: string, password: string) => {
        try {
            const res = await apiClient.post('/api/v1/user/signin', {
                email,
                password
            });

            // Store token if signin is successful
            if (res.data.token) {
                setAuthToken(res.data.token);
            }

            return res.data;
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { message?: string } } };
            throw new Error(axiosError.response?.data?.message || "Signin failed");
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
                password
            });

            return res.data;
        } catch (e: unknown) {
            const error = e as { response?: { data?: { message?: string } } };
            throw new Error(error.response?.data?.message || "Signup failed");
        }
    },

    logout: async () => {
        removeAuthToken();
        return { message: "Logged out successfully" };
    },

    balance: async () => {
        try {
            const res = await apiClient.get('/api/v1/user/balance');
            return res.data;
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { message?: string } } };
            throw new Error(axiosError.response?.data?.message || "Failed to fetch balance");
        }
    },

    // Asset-related APIs
    getAssets: async () => {
        try {
            const res = await apiClient.get('/api/v1/assets');
            return res.data;
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { message?: string } } };
            throw new Error(axiosError.response?.data?.message || "Failed to fetch assets");
        }
    },

    // Candles/Chart data APIs
    getCandles: async (symbol: string, interval: string, limit?: number) => {
        try {
            const params = new URLSearchParams({
                symbol,
                interval,
                ...(limit && { limit: limit.toString() })
            });
            const res = await apiClient.get(`/api/v1/candles?${params}`);
            return res.data;
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { message?: string } } };
            throw new Error(axiosError.response?.data?.message || "Failed to fetch candles");
        }
    },

    // Trading APIs
    placeTrade: async (tradeData: any) => {
        try {
            const res = await apiClient.post('/api/v1/trade', tradeData);
            return res.data;
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { message?: string } } };
            throw new Error(axiosError.response?.data?.message || "Failed to place trade");
        }
    },

    getOpenTrades: async () => {
        try {
            const res = await apiClient.get('/api/v1/trades/open');
            return res.data;
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { message?: string } } };
            throw new Error(axiosError.response?.data?.message || "Failed to fetch open trades");
        }
    },

    getClosedTrades: async () => {
        try {
            const res = await apiClient.get('/api/v1/trades');
            return res.data;
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { message?: string } } };
            throw new Error(axiosError.response?.data?.message || "Failed to fetch closed trades");
        }
    },

    // Utility functions for token management
    getToken: getAuthToken,
    isAuthenticated: () => !!getAuthToken(),
};
