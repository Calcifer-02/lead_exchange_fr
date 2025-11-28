import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://lead-exchange.onrender.com';

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

// Interceptor для обработки истекшего токена
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Проверяем на истекший токен
      const errorData = error.response.data as { code?: number; message?: string };
      if (
        error.response.status === 500 &&
        errorData?.message?.includes('token is expired')
      ) {
        localStorage.removeItem('token');
        localStorage.removeItem('userEmail');
        window.location.href = '/auth';
      }
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


export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('token');
  return !!token;
};

export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

export const getUserEmail = (): string | null => {
  return localStorage.getItem('userEmail');
};

export const getUserId = (): string | null => {
  return localStorage.getItem('userId');
};

export const logout = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userId');
  localStorage.removeItem('userFirstName');
  localStorage.removeItem('userLastName');
  localStorage.removeItem('userPhone');
};

// Функция для получения заголовка авторизации
export const getAuthHeader = (): { Authorization: string } | object => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Функция для получения полной конфигурации с авторизацией
export const getAuthConfig = () => {
  const token = getToken();

  if (token) {
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    };
  }

  // Для разработки - используем тестовый токен если нет реального
  return {
    headers: {
      'Authorization': 'Bearer test',
      'Content-Type': 'application/json',
    }
  };
};