// API client for communicating with your backend server
const API_BASE_URL = process.env.NODE_ENV === 'production' ? 'https://production-backend.com' : 'http://localhost:3000';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth endpoints
  async signIn(email: string, password: string) {
    return this.request('/api/v1/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async signUp(userData: { email: string; password: string; name?: string }) {
    return this.request('/api/v1/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Balance endpoints
  async getBalance() {
    return this.request('/api/v1/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
  }

  // Add more API methods as needed for your backend routes
}

export const apiClient = new ApiClient();
export default apiClient;
