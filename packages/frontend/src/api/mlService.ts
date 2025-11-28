import axios from 'axios';
import type { MatchRequest, MatchResponse, Property } from '../types/ml';

const ML_BASE_URL = 'http://localhost:5000';
const USE_MOCK_DATA = true;

export const mlApi = {
  // Добавить объект недвижимости
  addProperty: async (property: Omit<Property, 'id'>): Promise<string> => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return 'mock-property-id';
    }
    const response = await axios.post(`${ML_BASE_URL}/property`, property);
    return response.data;
  },

  // Удалить объект недвижимости
  deleteProperty: async (propertyId: string): Promise<string> => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return 'success';
    }
    const response = await axios.delete(`${ML_BASE_URL}/property/${propertyId}`);
    return response.data;
  },

  // Найти matches с ML
  findMatches: async (matchRequest: MatchRequest): Promise<MatchResponse> => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 600));

      // Умные моки которые реагируют на запрос
      const mockMatches = generateMockMatches(matchRequest);

      const mockResponse = {
        count: mockMatches.length,
        matches: mockMatches,
        distances: mockMatches.map(() => Math.random() * 3 + 0.5) // ML расстояния
      };

      return mockResponse;
    }

    // Реальный запрос к ML сервису
    const response = await axios.post(`${ML_BASE_URL}/match`, matchRequest);
    return response.data;
  },

  // Health check
  healthCheck: async (): Promise<string> => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 200));
      return 'healthy';
    }
    const response = await axios.get(`${ML_BASE_URL}/health`);
    return response.data;
  }
};

// Умная генерация моковых данных на основе запроса
function generateMockMatches(request: MatchRequest): any[] {
  const { requirements } = request;

  const baseMatches = [
    // Центральный район - премиум
    {
      id: 1,
      price: 12500000,
      district: "центральный",
      rooms: 2,
      area: 55,
      property_type: "apartment",
      floor: 5,
      total_floors: 12,
      renovation: "designer",
      has_balcony: true,
      has_parking: true,
      has_elevator: true,
      latitude: 55.7558,
      longitude: 37.6173
    },
    {
      id: 2,
      price: 18500000,
      district: "центральный",
      rooms: 3,
      area: 75,
      property_type: "apartment",
      floor: 7,
      total_floors: 14,
      renovation: "euro",
      has_balcony: true,
      has_parking: true,
      has_elevator: true,
      latitude: 55.7517,
      longitude: 37.6178
    },
    {
      id: 3,
      price: 8500000,
      district: "центральный",
      rooms: 1,
      area: 38,
      property_type: "apartment",
      floor: 3,
      total_floors: 9,
      renovation: "cosmetic",
      has_balcony: true,
      has_parking: false,
      has_elevator: true,
      latitude: 55.7580,
      longitude: 37.6150
    },

    // Северный район - комфорт
    {
      id: 4,
      price: 9800000,
      district: "северный",
      rooms: 2,
      area: 48,
      property_type: "apartment",
      floor: 7,
      total_floors: 16,
      renovation: "designer",
      has_balcony: true,
      has_parking: false,
      has_elevator: true,
      latitude: 55.8358,
      longitude: 37.4173
    },
    {
      id: 5,
      price: 15800000,
      district: "северный",
      rooms: 3,
      area: 72,
      property_type: "apartment",
      floor: 9,
      total_floors: 18,
      renovation: "euro",
      has_balcony: true,
      has_parking: true,
      has_elevator: true,
      latitude: 55.8458,
      longitude: 37.4273
    },
    {
      id: 6,
      price: 7200000,
      district: "северный",
      rooms: 1,
      area: 40,
      property_type: "apartment",
      floor: 2,
      total_floors: 5,
      renovation: "none",
      has_balcony: false,
      has_parking: false,
      has_elevator: false,
      latitude: 55.8258,
      longitude: 37.4073
    },

    // Южный район - бюджетные варианты
    {
      id: 7,
      price: 6500000,
      district: "южный",
      rooms: 1,
      area: 35,
      property_type: "apartment",
      floor: 1,
      total_floors: 5,
      renovation: "cosmetic",
      has_balcony: false,
      has_parking: false,
      has_elevator: false,
      latitude: 55.6558,
      longitude: 37.7173
    },
    {
      id: 8,
      price: 8900000,
      district: "южный",
      rooms: 2,
      area: 52,
      property_type: "apartment",
      floor: 4,
      total_floors: 9,
      renovation: "euro",
      has_balcony: true,
      has_parking: false,
      has_elevator: true,
      latitude: 55.6658,
      longitude: 37.7273
    },
    {
      id: 9,
      price: 11500000,
      district: "южный",
      rooms: 3,
      area: 68,
      property_type: "apartment",
      floor: 6,
      total_floors: 12,
      renovation: "designer",
      has_balcony: true,
      has_parking: true,
      has_elevator: true,
      latitude: 55.6758,
      longitude: 37.7373
    },

    // Восточный район - новые районы
    {
      id: 10,
      price: 7500000,
      district: "восточный",
      rooms: 2,
      area: 50,
      property_type: "apartment",
      floor: 8,
      total_floors: 16,
      renovation: "euro",
      has_balcony: true,
      has_parking: false,
      has_elevator: true,
      latitude: 55.7858,
      longitude: 37.8173
    },
    {
      id: 11,
      price: 10500000,
      district: "восточный",
      rooms: 3,
      area: 65,
      property_type: "apartment",
      floor: 12,
      total_floors: 25,
      renovation: "designer",
      has_balcony: true,
      has_parking: true,
      has_elevator: true,
      latitude: 55.7958,
      longitude: 37.8273
    },
    {
      id: 12,
      price: 5800000,
      district: "восточный",
      rooms: 1,
      area: 42,
      property_type: "apartment",
      floor: 3,
      total_floors: 10,
      renovation: "none",
      has_balcony: true,
      has_parking: false,
      has_elevator: true,
      latitude: 55.7758,
      longitude: 37.8073
    },

    // Западный район - спальные районы
    {
      id: 13,
      price: 8200000,
      district: "западный",
      rooms: 2,
      area: 54,
      property_type: "apartment",
      floor: 5,
      total_floors: 12,
      renovation: "cosmetic",
      has_balcony: true,
      has_parking: false,
      has_elevator: true,
      latitude: 55.6958,
      longitude: 37.5173
    },
    {
      id: 14,
      price: 12800000,
      district: "западный",
      rooms: 3,
      area: 70,
      property_type: "apartment",
      floor: 7,
      total_floors: 14,
      renovation: "euro",
      has_balcony: true,
      has_parking: true,
      has_elevator: true,
      latitude: 55.7058,
      longitude: 37.5273
    },
    {
      id: 15,
      price: 6900000,
      district: "западный",
      rooms: 1,
      area: 45,
      property_type: "apartment",
      floor: 2,
      total_floors: 5,
      renovation: "none",
      has_balcony: false,
      has_parking: false,
      has_elevator: false,
      latitude: 55.6858,
      longitude: 37.5073
    },

    // Приморский район - элитные виды
    {
      id: 16,
      price: 22000000,
      district: "приморский",
      rooms: 3,
      area: 85,
      property_type: "apartment",
      floor: 15,
      total_floors: 20,
      renovation: "designer",
      has_balcony: true,
      has_parking: true,
      has_elevator: true,
      latitude: 55.8858,
      longitude: 37.3173
    },
    {
      id: 17,
      price: 16500000,
      district: "приморский",
      rooms: 2,
      area: 60,
      property_type: "apartment",
      floor: 10,
      total_floors: 18,
      renovation: "euro",
      has_balcony: true,
      has_parking: true,
      has_elevator: true,
      latitude: 55.8758,
      longitude: 37.3273
    },

    // Речной район - у воды
    {
      id: 18,
      price: 9500000,
      district: "речной",
      rooms: 2,
      area: 56,
      property_type: "apartment",
      floor: 6,
      total_floors: 12,
      renovation: "cosmetic",
      has_balcony: true,
      has_parking: false,
      has_elevator: true,
      latitude: 55.8158,
      longitude: 37.4573
    },
    {
      id: 19,
      price: 14200000,
      district: "речной",
      rooms: 3,
      area: 78,
      property_type: "apartment",
      floor: 8,
      total_floors: 15,
      renovation: "euro",
      has_balcony: true,
      has_parking: true,
      has_elevator: true,
      latitude: 55.8258,
      longitude: 37.4673
    },

    // Загородный - дома
    {
      id: 20,
      price: 18500000,
      district: "загородный",
      rooms: 4,
      area: 120,
      property_type: "house",
      floor: 2,
      total_floors: 2,
      renovation: "designer",
      has_balcony: true,
      has_parking: true,
      has_elevator: false,
      latitude: 55.9258,
      longitude: 37.2173
    },
    {
      id: 21,
      price: 12500000,
      district: "загородный",
      rooms: 3,
      area: 95,
      property_type: "house",
      floor: 1,
      total_floors: 1,
      renovation: "cosmetic",
      has_balcony: true,
      has_parking: true,
      has_elevator: false,
      latitude: 55.9158,
      longitude: 37.2273
    },

    // Исторический центр - старый фонд
    {
      id: 22,
      price: 14500000,
      district: "исторический",
      rooms: 2,
      area: 58,
      property_type: "apartment",
      floor: 3,
      total_floors: 6,
      renovation: "designer",
      has_balcony: true,
      has_parking: false,
      has_elevator: false,
      latitude: 55.7458,
      longitude: 37.6273
    },
    {
      id: 23,
      price: 9800000,
      district: "исторический",
      rooms: 1,
      area: 42,
      property_type: "apartment",
      floor: 2,
      total_floors: 5,
      renovation: "none",
      has_balcony: false,
      has_parking: false,
      has_elevator: false,
      latitude: 55.7358,
      longitude: 37.6173
    },

    // Новый район - новостройки
    {
      id: 24,
      price: 11200000,
      district: "новый",
      rooms: 2,
      area: 62,
      property_type: "apartment",
      floor: 14,
      total_floors: 22,
      renovation: "euro",
      has_balcony: true,
      has_parking: true,
      has_elevator: true,
      latitude: 55.8958,
      longitude: 37.5573
    },
    {
      id: 25,
      price: 16800000,
      district: "новый",
      rooms: 3,
      area: 82,
      property_type: "apartment",
      floor: 18,
      total_floors: 25,
      renovation: "designer",
      has_balcony: true,
      has_parking: true,
      has_elevator: true,
      latitude: 55.9058,
      longitude: 37.5673
    }
  ];

  // Фильтрация по требованиям (имитация ML)
  let filtered = baseMatches;

  // Фильтр по районам
  if (requirements.districts && requirements.districts.length > 0) {
    filtered = filtered.filter(prop =>
      requirements.districts!.some(district =>
        prop.district.toLowerCase().includes(district.toLowerCase())
      )
    );
  }

  // Фильтр по комнатам
  if (requirements.rooms) {
    filtered = filtered.filter(prop => prop.rooms === requirements.rooms);
  }

  // Фильтр по цене
  if (requirements.max_price) {
    filtered = filtered.filter(prop => prop.price <= requirements.max_price!);
  }
  if (requirements.min_price) {
    filtered = filtered.filter(prop => prop.price >= requirements.min_price!);
  }

  // Если ничего не найдено, возвращаем случайные объекты
  if (filtered.length === 0) {
    // Возвращаем разнообразные объекты из разных районов
    const randomSelection = [
      baseMatches[0],  // центр
      baseMatches[4],  // север
      baseMatches[8],  // юг
      baseMatches[11], // восток
      baseMatches[14]  // запад
    ];
    return randomSelection.slice(0, request.k || 5);
  }

  return filtered.slice(0, request.k || 10);
}