import { apiClient } from './apiClient';
import type {
  User,
  UpdateProfileRequest,
  UpdateUserStatusRequest,
  ListUsersFilter,
  ListUsersResponse,
} from '../types/user';

/**
 * Преобразует объект фильтра в query параметры
 */
const buildFilterParams = (filter?: ListUsersFilter): Record<string, string> => {
  const params: Record<string, string> = {};

  if (filter?.email) {
    params['filter.email'] = filter.email;
  }
  if (filter?.firstName) {
    params['filter.firstName'] = filter.firstName;
  }
  if (filter?.lastName) {
    params['filter.lastName'] = filter.lastName;
  }
  if (filter?.phone) {
    params['filter.phone'] = filter.phone;
  }
  if (filter?.agencyName) {
    params['filter.agencyName'] = filter.agencyName;
  }
  if (filter?.role) {
    params['filter.role'] = filter.role;
  }
  if (filter?.status) {
    params['filter.status'] = filter.status;
  }

  return params;
};

export const userAPI = {
  /**
   * Получить профиль текущего пользователя
   */
  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<User>('/v1/user/profile');
    return response.data;
  },

  /**
   * Обновить профиль пользователя
   */
  updateProfile: async (data: UpdateProfileRequest): Promise<User> => {
    const response = await apiClient.patch<User>('/v1/user/profile', data);
    return response.data;
  },

  /**
   * Изменить статус пользователя (только для админов)
   */
  updateUserStatus: async (userId: string, data: UpdateUserStatusRequest): Promise<User> => {
    const response = await apiClient.patch<User>(`/v1/user/${userId}/status`, data);
    return response.data;
  },

  /**
   * Получить список пользователей (только для админов)
   */
  listUsers: async (filter?: ListUsersFilter): Promise<ListUsersResponse> => {
    const params = buildFilterParams(filter);
    const response = await apiClient.get<ListUsersResponse>('/v1/users', { params });
    return response.data;
  },
};

