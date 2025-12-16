export type DealStatus =
  | 'DEAL_STATUS_UNSPECIFIED'
  | 'DEAL_STATUS_PENDING'
  | 'DEAL_STATUS_ACCEPTED'
  | 'DEAL_STATUS_COMPLETED'
  | 'DEAL_STATUS_CANCELLED'
  | 'DEAL_STATUS_REJECTED';

export interface Deal {
  dealId: string;
  leadId: string;
  sellerUserId: string;
  buyerUserId: string;
  price: number;
  status: DealStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDealRequest {
  leadId: string;
  price: number;
  // Примечание: sellerUserId устанавливается бэкендом из токена авторизации
  // buyerUserId заполняется при вызове /accept
}

export interface UpdateDealRequest {
  status?: DealStatus;
  price?: number;
}

export interface ListDealsFilter {
  leadId?: string;
  sellerUserId?: string;
  buyerUserId?: string;
  status?: DealStatus;
  minPrice?: number;
  maxPrice?: number;
}

export interface DealResponse {
  deal: Deal;
}

export interface ListDealsResponse {
  deals: Deal[];
}