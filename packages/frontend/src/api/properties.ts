import { apiClient } from './apiClient';
import type {
  CreatePropertyRequest,
  MatchPropertiesRequest,
  MatchPropertiesResponse,
  Property,
  PropertyListFilter,
  PropertyListResponse,
  PropertyResponse,
} from '../types/properties';


/**
 * Получить список объектов недвижимости по фильтру
 */
const getProperties = async (filter?: PropertyListFilter): Promise<Property[]> => {
  try {
    const params: Record<string, string | number | undefined> = {};

    if (filter) {
      if (filter.status) params['filter.status'] = filter.status;
      if (filter.ownerUserId) params['filter.ownerUserId'] = filter.ownerUserId;
      if (filter.createdUserId) params['filter.createdUserId'] = filter.createdUserId;
      if (filter.propertyType) params['filter.propertyType'] = filter.propertyType;
      if (filter.minRooms !== undefined) params['filter.minRooms'] = filter.minRooms;
      if (filter.maxRooms !== undefined) params['filter.maxRooms'] = filter.maxRooms;
      if (filter.minPrice) params['filter.minPrice'] = filter.minPrice;
      if (filter.maxPrice) params['filter.maxPrice'] = filter.maxPrice;
    }

    const response = await apiClient.get<PropertyListResponse>('/v1/properties', { params });
    return response.data.properties || [];
  } catch (error) {
    console.error('Failed to fetch properties:', error);
    throw error;
  }
};

/**
 * Создать новый объект недвижимости
 */
const createProperty = async (data: CreatePropertyRequest): Promise<Property> => {
  try {
    const response = await apiClient.post<PropertyResponse>('/v1/properties', data);
    return response.data.property;
  } catch (error) {
    console.error('Failed to create property:', error);
    throw error;
  }
};

/**
 * Найти подходящие объекты недвижимости для лида по векторному сходству
 */
const matchProperties = async (request: MatchPropertiesRequest): Promise<MatchPropertiesResponse> => {
  try {
    const response = await apiClient.post<MatchPropertiesResponse>(
      `/v1/properties/match`,
      request
    );
    return response.data;
  } catch (error) {
    console.error('Failed to match properties:', error);
    throw error;
  }
};

/**
 * Получить информацию о конкретном объекте недвижимости
 */
const getPropertyById = async (propertyId: string): Promise<Property> => {
  try {
    const response = await apiClient.get<PropertyResponse>(
      `/v1/properties/${propertyId}`
    );
    return response.data.property;
  } catch (error) {
    console.error('Failed to fetch property by ID:', error);
    throw error;
  }
};

/**
 * Обновить объект недвижимости
 */
const updateProperty = async (
  propertyId: string,
  updateData: Partial<Omit<Property, 'propertyId' | 'createdAt' | 'updatedAt' | 'createdUserId'>>
): Promise<Property> => {
  try {
    const response = await apiClient.patch<PropertyResponse>(
      `/v1/properties/${propertyId}`,
      updateData
    );
    return response.data.property;
  } catch (error) {
    console.error('Failed to update property:', error);
    throw error;
  }
};

export const propertiesAPI = {
  getProperties,
  createProperty,
  matchProperties,
  getPropertyById,
  updateProperty,
};

