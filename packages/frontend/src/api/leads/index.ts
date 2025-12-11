import { apiClient } from '../apiClient';
import type {
  CreateLeadRequest,
  UpdateLeadRequest,
  ListLeadsFilter,
  ListLeadsResponse,
  LeadResponse,
} from '../../types';

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
