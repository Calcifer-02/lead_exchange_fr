// Lead API types based on backend Swagger

import type { PropertyType } from './properties';

export type LeadStatus =
  | 'LEAD_STATUS_UNSPECIFIED'
  | 'LEAD_STATUS_NEW'
  | 'LEAD_STATUS_PUBLISHED'
  | 'LEAD_STATUS_PURCHASED'
  | 'LEAD_STATUS_DELETED';


export interface Lead {
  leadId: string;           // UUID лида
  title: string;
  description: string;
  requirement: string;      // JSON с предпочтениями ("roomNumber": 3, "price": "5000000")
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  status: LeadStatus;
  ownerUserId: string;      // текущий владелец
  createdUserId: string;    // создатель
  createdAt: string;
  updatedAt: string;
  city?: string;            // город
  propertyType?: PropertyType; // тип недвижимости
}

export interface CreateLeadRequest {
  title: string;
  description: string;
  requirement?: string;      // base64 encoded JSON
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  city?: string;
  propertyType?: PropertyType;
}

export interface UpdateLeadRequest {
  title?: string;
  description?: string;
  requirement?: string;     // base64 encoded JSON
  status?: LeadStatus;
  ownerUserId?: string;
  city?: string;
}

export interface ListLeadsFilter {
  status?: LeadStatus;
  ownerUserId?: string;
  createdUserId?: string;
  city?: string;
  propertyType?: PropertyType;
}

export interface ListLeadsRequest {
  filter?: ListLeadsFilter;
  pageSize?: number;
  pageToken?: string;
  orderBy?: string;
  orderDirection?: string;
}

export interface ListLeadsResponse {
  leads: Lead[];
  nextPageToken?: string;
}

export interface LeadResponse {
  lead: Lead;
}

export interface ApiError {
  code: number;
  message: string;
  details?: unknown[];
}

// Helper types for UI
export interface LeadRequirement {
  roomNumber?: number;
  price?: string;
  [key: string]: unknown;
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  LEAD_STATUS_UNSPECIFIED: 'Не задан',
  LEAD_STATUS_NEW: 'На модерации',
  LEAD_STATUS_PUBLISHED: 'Опубликован',
  LEAD_STATUS_PURCHASED: 'Куплен',
  LEAD_STATUS_DELETED: 'Удалён',
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, { text: string; bg: string; border: string }> = {
  LEAD_STATUS_UNSPECIFIED: { text: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
  LEAD_STATUS_NEW: { text: '#D97706', bg: '#FFFBEB', border: '#FCD34D' },
  LEAD_STATUS_PUBLISHED: { text: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  LEAD_STATUS_PURCHASED: { text: '#7C3AED', bg: '#F3E8FF', border: '#C4B5FD' },
  LEAD_STATUS_DELETED: { text: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5' },
};

