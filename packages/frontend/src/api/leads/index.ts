import axios from 'axios';
import type {
  CreateLeadRequest,
  UpdateLeadRequest,
  ListLeadsFilter,
  ListLeadsResponse,
  LeadResponse,
} from '../../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://lead-exchange.onrender.com';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': 'Bearer test',
    'Content-Type': 'application/json',
  },
});

// Interceptor для добавления токена авторизации
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
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

/**
 * Преобразует объект фильтра в query параметры
 */
const buildFilterParams = (filter?: ListLeadsFilter): Record<string, string> => {
  const params: Record<string, string> = {};

  if (filter?.status) {
    params['filter.status'] = filter.status;
  }
  if (filter?.ownerUserId) {
    params['filter.ownerUserId'] = filter.ownerUserId;
  }
  if (filter?.createdUserId) {
    params['filter.createdUserId'] = filter.createdUserId;
  }

  return params;
};

export const leadsAPI = {
  /**
   * Получить список лидов по фильтру
   */
  listLeads: async (filter?: ListLeadsFilter): Promise<ListLeadsResponse> => {
    const params = buildFilterParams(filter);
    const response = await apiClient.get<ListLeadsResponse>('/v1/leads', { params });
    return response.data;
  },

  /**
   * Получить конкретный лид по ID
   */
  getLead: async (leadId: string): Promise<LeadResponse> => {
    const response = await apiClient.get<LeadResponse>(`/v1/leads/${leadId}`);
    return response.data;
  },

  /**
   * Создать новый лид
   */
  createLead: async (data: CreateLeadRequest): Promise<LeadResponse> => {
    const response = await apiClient.post<LeadResponse>('/v1/leads', data);
    return response.data;
  },

  /**
   * Обновить лид
   */
  updateLead: async (leadId: string, data: UpdateLeadRequest): Promise<LeadResponse> => {
    const response = await apiClient.patch<LeadResponse>(`/v1/leads/${leadId}`, data);
    return response.data;
  },
};
