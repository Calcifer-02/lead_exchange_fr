export interface Property {
  id?: string;
  price: number;
  district: string;
  rooms: number;
  area: number;
  property_type: 'apartment' | 'house' | 'commercial';
  floor: number;
  total_floors: number;
  renovation: 'none' | 'cosmetic' | 'designer' | 'euro';
  has_balcony: boolean;
  has_parking: boolean;
  has_elevator: boolean;
  latitude: number;
  longitude: number;
}

export interface Requirements {
  min_price?: number;
  max_price?: number;
  districts?: string[];
  rooms?: number;
  min_rooms?: number;
  max_rooms?: number;
  min_area?: number;
  max_area?: number;
  property_type?: Property['property_type'];
  renovation?: Property['renovation'];
  has_balcony?: boolean;
  has_parking?: boolean;
  has_elevator?: boolean;
}

export interface MatchRequest {
  requirements: Requirements;
  k?: number;
}

export interface MatchResponse {
  count: number;
  matches: Property[];
  distances?: number[]; // ML-расстояния для отображения релевантности
}