import { apiClient } from './apiClient';
import type {
  Deal,
  CreateDealRequest,
  UpdateDealRequest,
  ListDealsFilter,
  DealResponse,
  ListDealsResponse
} from '../types/deals';

/**
 * Преобразует объект фильтра в query параметры согласно Swagger
 */
const buildFilterParams = (filter?: ListDealsFilter): Record<string, string | number> => {
  const params: Record<string, string | number> = {};

  if (filter?.leadId) {
    params['filter.leadId'] = filter.leadId;
  }
  if (filter?.sellerUserId) {
    params['filter.sellerUserId'] = filter.sellerUserId;
  }
  if (filter?.buyerUserId) {
    params['filter.buyerUserId'] = filter.buyerUserId;
  }
  if (filter?.status) {
    params['filter.status'] = filter.status;
  }
  if (filter?.minPrice !== undefined) {
    params['filter.minPrice'] = filter.minPrice;
  }
  if (filter?.maxPrice !== undefined) {
    params['filter.maxPrice'] = filter.maxPrice;
  }

  return params;
};

const fetchDeals = async (filter?: ListDealsFilter): Promise<Deal[]> => {
  const params = buildFilterParams(filter);
  const response = await apiClient.get<ListDealsResponse>('/v1/deals', { params });
  return response.data.deals || [];
};

const createDeal = async (dealData: CreateDealRequest): Promise<Deal> => {
  const response = await apiClient.post<DealResponse>(
    '/v1/deals',
    dealData
  );
  return response.data.deal;
};

const getDealById = async (dealId: string): Promise<Deal> => {
  const response = await apiClient.get<DealResponse>(`/v1/deals/${dealId}`);
  return response.data.deal;
};

const updateDeal = async (dealId: string, updateData: UpdateDealRequest): Promise<Deal> => {
  const response = await apiClient.patch<DealResponse>(
    `/v1/deals/${dealId}`,
    updateData
  );
  return response.data.deal;
};

const acceptDeal = async (dealId: string): Promise<Deal> => {
  const response = await apiClient.post<DealResponse>(
    `/v1/deals/${dealId}/accept`,
    {}
  );
  return response.data.deal;
};

const dealsAPI = {
  fetchDeals,
  createDeal,
  getDealById,
  updateDeal,
  acceptDeal,
};

export { dealsAPI };