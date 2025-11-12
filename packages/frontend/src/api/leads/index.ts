import axios from 'axios';
import type {
  CreateLeadRequest,
  UpdateLeadRequest,
  ListLeadsFilter,
  ListLeadsResponse,
  LeadResponse,
} from '../../types/leads';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
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

// Interceptor для логирования ошибок и обработки истекшего токена
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('Lead API Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers,
        url: error.config?.url,
        method: error.config?.method,
      });
      console.error('Full error response:', JSON.stringify(error.response.data, null, 2));

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
      console.error('Network Error - no response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
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
    console.log('Fetching leads with filter:', filter);

    const params = buildFilterParams(filter);
    const response = await apiClient.get<ListLeadsResponse>('/v1/leads', { params });

    console.log(`Fetched ${response.data.leads.length} leads`);
    return response.data;
  },

  /**
   * Получить конкретный лид по ID
   */
  getLead: async (leadId: string): Promise<LeadResponse> => {
    console.log('Fetching lead:', leadId);

    const response = await apiClient.get<LeadResponse>(`/v1/leads/${leadId}`);

    console.log('Fetched lead:', response.data.lead.title);
    return response.data;
  },

  /**
   * Создать новый лид
   */
  createLead: async (data: CreateLeadRequest): Promise<LeadResponse> => {
    console.log('Creating lead:', data.title);

    const response = await apiClient.post<LeadResponse>('/v1/leads', data);

    console.log('Created lead:', response.data.lead.leadId);
    return response.data;
  },

  /**
   * Обновить лид
   */
  updateLead: async (leadId: string, data: UpdateLeadRequest): Promise<LeadResponse> => {
    console.log('Updating lead:', leadId, data);

    const response = await apiClient.patch<LeadResponse>(`/v1/leads/${leadId}`, data);

    console.log('Updated lead:', response.data.lead.title);
    return response.data;
  },
};
