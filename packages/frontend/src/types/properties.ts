// Property API types based on backend Swagger

export type PropertyType =
  | 'PROPERTY_TYPE_UNSPECIFIED'
  | 'PROPERTY_TYPE_APARTMENT'
  | 'PROPERTY_TYPE_HOUSE'
  | 'PROPERTY_TYPE_COMMERCIAL'
  | 'PROPERTY_TYPE_LAND';

export type PropertyStatus =
  | 'PROPERTY_STATUS_UNSPECIFIED'
  | 'PROPERTY_STATUS_NEW'
  | 'PROPERTY_STATUS_PUBLISHED'
  | 'PROPERTY_STATUS_SOLD'
  | 'PROPERTY_STATUS_DELETED';

export interface Property {
  propertyId: string;
  title: string;
  description: string;
  address: string;
  price: string;
  area: number;
  rooms: number;
  propertyType: PropertyType;
  status: PropertyStatus;
  ownerUserId: string;
  createdUserId: string;
  createdAt: string;
  updatedAt: string;
  city?: string;
}

export interface CreatePropertyRequest {
  title: string;
  description: string;
  address: string;
  price: string;
  area: number;
  rooms: number;
  propertyType: PropertyType;
  city?: string;
}

export interface UpdatePropertyRequest {
  title?: string;
  description?: string;
  address?: string;
  price?: string;
  area?: number;
  rooms?: number;
  propertyType?: PropertyType;
  status?: PropertyStatus;
  ownerUserId?: string;
  city?: string;
}

export interface PropertyListFilter {
  status?: PropertyStatus;
  ownerUserId?: string;
  createdUserId?: string;
  propertyType?: PropertyType;
  minRooms?: number;
  maxRooms?: number;
  minPrice?: string;
  maxPrice?: string;
  city?: string;
}

export interface ListPropertiesRequest {
  filter?: PropertyListFilter;
  pageSize?: number;
  pageToken?: string;
  orderBy?: string;
  orderDirection?: string;
}

export interface PropertyListResponse {
  properties: Property[];
  nextPageToken?: string;
}

export interface PropertyMatch {
  property: Property;
  similarity: number;
}

export interface MatchPropertiesFilter {
  minPrice?: string;
  maxPrice?: string;
  minRooms?: number;
  maxRooms?: number;
  propertyType?: PropertyType;
  status?: PropertyStatus;
  city?: string;
}

export interface MatchPropertiesRequest {
  leadId: string;
  limit?: number;
  filter?: MatchPropertiesFilter;
}

export interface MatchPropertiesResponse {
  matches: PropertyMatch[];
}

export interface PropertyResponse {
  property: Property;
}

// UI Helper Labels
export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  PROPERTY_TYPE_UNSPECIFIED: 'Не указан',
  PROPERTY_TYPE_APARTMENT: 'Квартира',
  PROPERTY_TYPE_HOUSE: 'Дом',
  PROPERTY_TYPE_COMMERCIAL: 'Коммерция',
  PROPERTY_TYPE_LAND: 'Земельный участок',
};

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  PROPERTY_STATUS_UNSPECIFIED: 'Не указан',
  PROPERTY_STATUS_NEW: 'Новый',
  PROPERTY_STATUS_PUBLISHED: 'Опубликован',
  PROPERTY_STATUS_SOLD: 'Продан',
  PROPERTY_STATUS_DELETED: 'Удалён',
};
