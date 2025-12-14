import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://lead-exchange.onrender.com';

// Создаем единый axios инстанс для всех API запросов
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor для добавления токена авторизации к каждому запросу
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor для обработки ошибок авторизации
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      const errorData = error.response.data as { code?: number; message?: string };

      // Обработка ошибок авторизации (401 или истекший токен или отсутствующий токен)
      if (
        error.response.status === 401 ||
        (error.response.status === 500 && errorData?.message?.includes('token is expired')) ||
        (error.response.status === 500 && errorData?.message?.includes('missing authorization header'))
      ) {
        // Очищаем данные авторизации
        localStorage.removeItem('token');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userId');
        localStorage.removeItem('userFirstName');
        localStorage.removeItem('userLastName');
        localStorage.removeItem('userPhone');

        // Перенаправляем на страницу авторизации
        if (window.location.pathname !== '/auth') {
          window.location.href = '/auth';
        }
      }
    }
    return Promise.reject(error);
  }
);

