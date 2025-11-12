import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  agencyName: string;
  avatarUrl?: string;
}

export interface AuthResponse {
  token: string;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor для логирования ошибок и обработки истекшего токена
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('API Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers,
        url: error.config.url,
        method: error.config.method,
        requestData: error.config.data,
      });

      // Проверяем на истекший токен
      const errorData = error.response.data as { code?: number; message?: string };
      if (
        error.response.status === 500 &&
        errorData?.message?.includes('token is expired')
      ) {
        console.warn('Token expired, redirecting to /auth');
        localStorage.removeItem('token');
        localStorage.removeItem('userEmail');
        window.location.href = '/auth';
      }
    } else if (error.request) {
      console.error('Network Error:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/v1/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<void> => {
    await apiClient.post('/v1/auth/register', data);
  },

  healthCheck: async (): Promise<{ status: string }> => {
    const response = await apiClient.get('/v1/health');
    return response.data;
  },
};

