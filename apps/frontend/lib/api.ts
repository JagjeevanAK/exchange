import axios from "axios";

// Backend server configuration
const endpoint = "http://localhost:3001";

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

// Helper to check if JWT token is expired
const isTokenExpired = (token: string): boolean => {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        return payload.exp < currentTime;
    } catch {
        return true; // Consider invalid tokens as expired
    }
};

// Helper function to handle authentication errors consistently
const handleAuthError = (errorMessage: string | undefined): Error => {
    if (errorMessage === "Invalid token" || 
        errorMessage === "No token in header" || 
        errorMessage === "No authorization in header") {
        removeAuthToken();
        return new Error("Session expired. Please sign in again.");
    }
    return new Error(errorMessage || "Request failed");
};

// Helper function to check if user needs authentication
const requireAuth = (): void => {
    const token = getAuthToken();
    if (!token) {
        throw new Error("Authentication required. Please sign in to continue.");
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
    getCandles: async (asset: string, timeframe: string, startTime?: number, endTime?: number) => {
        try {
            // Check if user is authenticated before making the request
            // requireAuth();

            // Default to last 24 hours if no time range provided
            const now = Math.floor(Date.now() / 1000);
            const defaultStartTime = now - (24 * 60 * 60); // 24 hours ago
            
            const params = new URLSearchParams({
                asset: asset, // Keep the full symbol like BTCUSDT
                ts: timeframe,
                startTime: (startTime || defaultStartTime).toString(),
                endTime: (endTime || now).toString()
            });
            
            const res = await apiClient.get(`/api/v1/candles?${params}`);
            return res.data;
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { message?: string } } };
            throw handleAuthError(axiosError.response?.data?.message);
        }
    },

    // Get latest candle for real-time updates
    getLatestCandle: async (asset: string, timeframe: string = '1m') => {
        try {
            // Check if user is authenticated before making the request
            requireAuth();

            const params = new URLSearchParams({
                asset: asset, // Keep the full symbol like BTCUSDT
                ts: timeframe
            });
            
            const res = await apiClient.get(`/api/v1/candles/latest?${params}`);
            return res.data;
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { message?: string } } };
            throw handleAuthError(axiosError.response?.data?.message);
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
    
    // Debug helper to check auth status
    checkAuthStatus: () => {
        const token = getAuthToken();
        return {
            hasToken: !!token,
            token: token ? token.substring(0, 20) + '...' : null, // Only show first 20 chars for security
            isExpired: token ? isTokenExpired(token) : null
        };
    },
};
