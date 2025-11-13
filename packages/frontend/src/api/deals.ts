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

const API_BASE_URL = 'http://localhost:8081/v1';

const fetchDeals = async (filter: ListDealsFilter = {}): Promise<Deal[]> => {
  try {
    console.log('🔵 Fetching deals with filter:', filter);

    const config = getAuthConfig();
    const response = await axios.get<ListDealsResponse>(`${API_BASE_URL}/deals`, {
      params: filter,
      ...config
    });

    console.log('🟢 Deals fetched successfully:', response.data);
    return response.data.deals;
  } catch (error) {
    console.error('🔴 Failed to fetch deals:', error);
    throw error;
  }
};

const createDeal = async (dealData: CreateDealRequest): Promise<Deal> => {
  try {
    console.log('🔵 Creating deal with data:', dealData);

    const config = getAuthConfig();
    const response = await axios.post<DealResponse>(
      `${API_BASE_URL}/deals`,
      dealData,
      config
    );

    console.log('🟢 Deal created successfully:', response.data);
    return response.data.deal;
  } catch (error) {
    console.error('🔴 Failed to create deal:', error);
    throw error;
  }
};

// Аналогично обновите остальные методы (getDealById, updateDeal, acceptDeal)
// добавив const config = getAuthConfig(); и ...config в запрос

const getDealById = async (dealId: string): Promise<Deal> => {
  try {
    console.log('🔵 Fetching deal by ID:', dealId);

    const config = getAuthConfig();
    const response = await axios.get<DealResponse>(`${API_BASE_URL}/deals/${dealId}`, config);

    console.log('🟢 Deal fetched successfully:', response.data);
    return response.data.deal;
  } catch (error) {
    console.error('🔴 Failed to fetch deal by ID:', error);
    throw error;
  }
};

const updateDeal = async (dealId: string, updateData: UpdateDealRequest): Promise<Deal> => {
  try {
    console.log('🔵 Updating deal:', dealId, 'with data:', updateData);

    const config = getAuthConfig();
    const response = await axios.patch<DealResponse>(
      `${API_BASE_URL}/deals/${dealId}`,
      updateData,
      config
    );

    console.log('🟢 Deal updated successfully:', response.data);
    return response.data.deal;
  } catch (error) {
    console.error('🔴 Failed to update deal:', error);
    throw error;
  }
};

const acceptDeal = async (dealId: string): Promise<Deal> => {
  try {
    console.log('🔵 Accepting deal:', dealId);

    const config = getAuthConfig();
    const response = await axios.post<DealResponse>(
      `${API_BASE_URL}/deals/${dealId}/accept`,
      {},
      config
    );

    console.log('🟢 Deal accepted successfully:', response.data);
    return response.data.deal;
  } catch (error) {
    console.error('🔴 Failed to accept deal:', error);
    throw error;
  }
};

const dealsAPI = {
  fetchDeals,
  createDeal,
  getDealById,
  updateDeal,
  acceptDeal,
};

export { dealsAPI };