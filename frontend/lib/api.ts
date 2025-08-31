import axios from "axios";

const endpoint = process.env.NODE_ENV === "production" ? process.env.BACKEND_URL : "http://localhost:3001";

const getAuthToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('token');
    }
    return null;
};

export const api = {
    signin: async (email: string, password: string) => {
        try {
            const res = await axios.post(`${endpoint}/api/v1/user/signin`,
                { email, password },
                { headers: { "Content-Type": "application/json" } }
            );

            return res.data;
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { message?: string } } };
            throw new Error(axiosError.response?.data?.message || "Signin failed");
        }
    },

    signup: async (email: string, password: string) =>{
        try {
            const res = await axios.post(`${endpoint}/api/v1/user/singnup`,
                {email, password},
                {headers: { "Content-Type": "application/json" }}
            );

            return res.data;
        } catch(e: unknown){
            const error = e as {response?: { data?: {message?: string}}};
            throw new Error(error.response?.data?.message|| "Singup failed");
        }
    },

    balance: async (token: string) => {
        try {
            const res = await axios.get(`${endpoint}/api/v1/user/balance`, {
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            return res.data;
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { message?: string } } };
            throw new Error(axiosError.response?.data?.message || "Failed to fetch balance");
        }
    },

    // Convenience function that automatically gets token from localStorage
    getBalance: async () => {
        const token = getAuthToken();
        if (!token) {
            throw new Error("No authentication token found. Please login first.");
        }
        return api.balance(token);
    }
};
