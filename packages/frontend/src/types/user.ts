// User API types based on backend Swagger

export type UserRole =
  | 'USER_ROLE_UNSPECIFIED'
  | 'USER_ROLE_USER'
  | 'USER_ROLE_ADMIN';

export type UserStatus =
  | 'USER_STATUS_UNSPECIFIED'
  | 'USER_STATUS_ACTIVE'
  | 'USER_STATUS_BANNED'
  | 'USER_STATUS_SUSPENDED';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  agencyName: string;
  avatarUrl: string;
  role: UserRole;
  status: UserStatus;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  agencyName?: string;
  avatarUrl?: string;
}

export interface UpdateUserStatusRequest {
  status: UserStatus;
}

export interface ListUsersFilter {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  agencyName?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface ListUsersResponse {
  users: User[];
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  USER_ROLE_UNSPECIFIED: 'Не задан',
  USER_ROLE_USER: 'Пользователь',
  USER_ROLE_ADMIN: 'Администратор',
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  USER_STATUS_UNSPECIFIED: 'Не задан',
  USER_STATUS_ACTIVE: 'Активен',
  USER_STATUS_BANNED: 'Заблокирован',
  USER_STATUS_SUSPENDED: 'Приостановлен',
};

export const USER_STATUS_COLORS: Record<UserStatus, { text: string; bg: string; border: string }> = {
  USER_STATUS_UNSPECIFIED: { text: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
  USER_STATUS_ACTIVE: { text: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  USER_STATUS_BANNED: { text: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5' },
  USER_STATUS_SUSPENDED: { text: '#D97706', bg: '#FFFBEB', border: '#FCD34D' },
};

