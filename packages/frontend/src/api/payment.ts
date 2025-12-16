import axios from 'axios';

const PAYMENT_API_URL = 'https://payment-guf5.onrender.com';

// Создаем отдельный axios инстанс для платежного сервиса
const paymentClient = axios.create({
  baseURL: PAYMENT_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export interface CreatePaymentRequest {
  value: string;
  orderId: string;
  userId: string;
  returnUrl?: string; // URL для возврата после оплаты
}

export interface PaymentObject {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  paid: boolean;
  confirmation?: {
    type: string;
    confirmation_url: string;
  };
  amount: {
    value: string;
    currency: string;
  };
  metadata: {
    orderId: string;
    userId: string;
  };
}

export interface PaymentResponse {
  payment: PaymentObject;
}

/**
 * Создает платеж в ЮKassa
 * @param data - данные для создания платежа
 * @returns объект платежа с URL для редиректа
 */
const createPayment = async (data: CreatePaymentRequest): Promise<PaymentResponse> => {
  const response = await paymentClient.post<PaymentResponse>('/api/payment', data);
  return response.data;
};

/**
 * Создает платеж для сделки
 * @param dealId - ID сделки
 * @param price - сумма платежа
 * @param userId - ID пользователя
 * @returns URL для перенаправления на страницу оплаты
 */
const createDealPayment = async (dealId: string, price: number, userId: string): Promise<string> => {
  const paymentData: CreatePaymentRequest = {
    value: price.toFixed(2),
    orderId: dealId,
    userId: userId,
  };

  const response = await createPayment(paymentData);
  return response.payment.confirmation!.confirmation_url;
};

/**
 * Получает статус платежа по ID
 * @param paymentId - ID платежа
 * @returns объект платежа со статусом
 */
const getPaymentStatus = async (paymentId: string): Promise<PaymentObject> => {
  const response = await paymentClient.get<PaymentResponse>(`/api/payment/${paymentId}`);
  return response.data.payment;
};

export const paymentAPI = {
  createPayment,
  createDealPayment,
  getPaymentStatus,
};

