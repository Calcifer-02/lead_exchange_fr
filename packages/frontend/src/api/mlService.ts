import axios from 'axios';
import type { MatchRequest, MatchResponse, Property } from '../types/ml';



const ML_BASE_URL = 'http://localhost:5000'; // или ваш ML-сервис URL

export const mlApi = {
  // Добавить объект недвижимости
  addProperty: async (property: Omit<Property, 'id'>): Promise<string> => {
    const response = await axios.post(`${ML_BASE_URL}/property`, property);
    return response.data;
  },

  // Удалить объект недвижимости
  deleteProperty: async (propertyId: string): Promise<string> => {
    const response = await axios.delete(`${ML_BASE_URL}/property/${propertyId}`);
    return response.data;
  },

  // Найти matches с ML
  findMatches: async (requirements: MatchRequest): Promise<MatchResponse> => {
    try {
      console.log('📤 Sending ML request:', JSON.stringify(requirements, null, 2));
      const response = await axios.post(`${ML_BASE_URL}/match`, requirements);
      console.log('📥 ML response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ ML API error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Health check
  healthCheck: async (): Promise<string> => {
    const response = await axios.get(`${ML_BASE_URL}/health`);
    return response.data;
  }
};
