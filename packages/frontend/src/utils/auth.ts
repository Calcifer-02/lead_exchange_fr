// Утилиты для работы с аутентификацией

export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('token');
  return !!token;
};

export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

export const getUserEmail = (): string | null => {
  return localStorage.getItem('userEmail');
};

export const logout = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('userEmail');
};

export const getAuthHeader = (): { Authorization: string } | {} => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

