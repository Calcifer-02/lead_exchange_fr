import axios from 'axios';
import { getAuthConfig } from './auth'; // Импортируем из вашего auth.ts
import type {
  Deal,
  CreateDealRequest,
  UpdateDealRequest,
  ListDealsFilter,
  DealResponse,
  ListDealsResponse
} from '../types/deals';

const API_BASE_URL = 'https://lead-exchange.onrender.com/v1';

const fetchDeals = async (filter: ListDealsFilter = {}): Promise<Deal[]> => {
  const config = getAuthConfig();
  const response = await axios.get<ListDealsResponse>(`${API_BASE_URL}/deals`, {
    params: filter,
    ...config
  });
  return response.data.deals;
};

const createDeal = async (dealData: CreateDealRequest): Promise<Deal> => {
  const config = getAuthConfig();
  const response = await axios.post<DealResponse>(
    `${API_BASE_URL}/deals`,
    dealData,
    config
  );
  return response.data.deal;
};

// Аналогично обновите остальные методы (getDealById, updateDeal, acceptDeal)
// добавив const config = getAuthConfig(); и ...config в запрос

const getDealById = async (dealId: string): Promise<Deal> => {
  const config = getAuthConfig();
  const response = await axios.get<DealResponse>(`${API_BASE_URL}/deals/${dealId}`, config);
  return response.data.deal;
};

const updateDeal = async (dealId: string, updateData: UpdateDealRequest): Promise<Deal> => {
  const config = getAuthConfig();
  const response = await axios.patch<DealResponse>(
    `${API_BASE_URL}/deals/${dealId}`,
    updateData,
    config
  );
  return response.data.deal;
};

const acceptDeal = async (dealId: string): Promise<Deal> => {
  const config = getAuthConfig();
  const response = await axios.post<DealResponse>(
    `${API_BASE_URL}/deals/${dealId}/accept`,
    {},
    config
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