// Auth API types

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  agencyName: string;
}

export interface ApiError {
  code: number;
  message: string;
  details?: unknown[];
}
