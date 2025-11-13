import axios from 'axios';
import { getAuthConfig } from './auth';

const API_BASE_URL = 'http://localhost:8081/v1';

interface Deal {
  price: number;
  createdAt: string;
  status: string;
}

interface Lead {
  requirement: string;
}

export interface DealStats {
  date: string;
  count: number;
  totalAmount: number;
}

export interface LeadStats {
  propertyType: string;
  count: number;
  percentage: number;
}

export interface CreditStats {
  date: string;
  spent: number;
  remaining: number;
}

export interface DealStatusStats {
  status: string;
  count: number;
  percentage: number;
}

export interface DashboardMetrics {
  totalLeads: number;
  totalDeals: number;
  activeDeals: number;
  conversionRate: number;
  avgDealPrice: number;
  dealsThisMonth: number;
}



export const statsAPI = {
  // Статистика сделок по дням
  getDealsStats: async (days: number = 30): Promise<DealStats[]> => {
    try {
      const config = getAuthConfig();
      // Если бэкенд не поддерживает эту статистику, можем считать на фронтенде
      const response = await axios.get(`${API_BASE_URL}/deals`, config);
      const deals = response.data.deals || [];

      // Группируем сделки по дням
      const stats: Record<string, DealStats> = {};
      const now = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        stats[dateStr] = {
          date: dateStr,
          count: 0,
          totalAmount: 0
        };
      }

      deals.forEach((deal: Deal) => {
        const dealDate = new Date(deal.createdAt).toISOString().split('T')[0];
        if (stats[dealDate]) {
          stats[dealDate].count += 1;
          stats[dealDate].totalAmount += deal.price;
        }
      });

      return Object.values(stats);
    } catch (error) {
      console.error('Failed to fetch deals stats:', error);
      return [];
    }
  },

  // Статистика по типам недвижимости
  getLeadsByPropertyType: async (): Promise<LeadStats[]> => {
    try {
      const config = getAuthConfig();
      const response = await axios.get(`${API_BASE_URL}/leads`, config);
      const leads = response.data.leads || [];

      // Анализируем requirement для определения типа недвижимости
      const typeCounts: Record<string, number> = {};
      let total = 0;

      leads.forEach((lead: Lead) => {
        try {
          const requirement = JSON.parse(lead.requirement);
          const propertyType = requirement.propertyType || 'unknown';
          typeCounts[propertyType] = (typeCounts[propertyType] || 0) + 1;
          total++;
        } catch {
          typeCounts['unknown'] = (typeCounts['unknown'] || 0) + 1;
          total++;
        }
      });

      return Object.entries(typeCounts).map(([type, count]) => ({
        propertyType: getPropertyTypeLabel(type),
        count: count as number,
        percentage: total > 0 ? Math.round(((count as number) / total) * 100) : 0
      }));
    } catch (error) {
      console.error('Failed to fetch leads stats:', error);
      return [];
    }
  },

  getDealsByStatus: async (): Promise<DealStatusStats[]> => {
    try {
      const config = getAuthConfig();
      const response = await axios.get(`${API_BASE_URL}/deals`, config);
      const deals = response.data.deals || [];

      const statusCounts: Record<string, number> = {};
      let total = 0;

      deals.forEach((deal: Deal) => {
        const status = deal.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
        total++;
      });

      return Object.entries(statusCounts).map(([status, count]) => ({
        status: getDealStatusLabel(status),
        count: count as number,
        percentage: total > 0 ? Math.round(((count as number) / total) * 100) : 0
      }));
    } catch (error) {
      console.error('Failed to fetch deals status stats:', error);
      return [];
    }
  },

  getDashboardMetrics: async (): Promise<DashboardMetrics> => {
    try {
      const config = getAuthConfig();
      const [leadsResponse, dealsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/leads`, config),
        axios.get(`${API_BASE_URL}/deals`, config)
      ]);

      const leads: Lead[] = leadsResponse.data.leads || [];
      const deals: Deal[] = dealsResponse.data.deals || [];

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // Активные сделки (PENDING и ACCEPTED)
      const activeDeals = deals.filter(deal =>
        deal.status === 'DEAL_STATUS_PENDING' ||
        deal.status === 'DEAL_STATUS_ACCEPTED'
      );

      // Сделки за текущий месяц
      const dealsThisMonth = deals.filter(deal => {
        const dealDate = new Date(deal.createdAt);
        return dealDate.getMonth() === currentMonth &&
          dealDate.getFullYear() === currentYear;
      });

      // Конверсия (отношение сделок к лидам)
      const conversionRate = leads.length > 0
        ? Math.round((deals.length / leads.length) * 10000) / 100 // 2 знака после запятой
        : 0;

      // Средняя цена сделки
      const totalDealPrice = deals.reduce((sum, deal) => sum + (deal.price || 0), 0);
      const avgDealPrice = deals.length > 0 ? Math.round(totalDealPrice / deals.length) : 0;

      return {
        totalLeads: leads.length,
        totalDeals: deals.length,
        activeDeals: activeDeals.length,
        conversionRate,
        avgDealPrice,
        dealsThisMonth: dealsThisMonth.length
      };
    } catch (error) {
      console.error('Failed to fetch dashboard metrics:', error);
      return {
        totalLeads: 0,
        totalDeals: 0,
        activeDeals: 0,
        conversionRate: 0,
        avgDealPrice: 0,
        dealsThisMonth: 0
      };
    }
  }

};
const getDealStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'DEAL_STATUS_PENDING': 'Ожидает',
    'DEAL_STATUS_ACCEPTED': 'Принята',
    'DEAL_STATUS_COMPLETED': 'Завершена',
    'DEAL_STATUS_CANCELLED': 'Отменена',
    'DEAL_STATUS_REJECTED': 'Отклонена',
    'unknown': 'Не указан'
  };
  return labels[status] || status;
};

// Вспомогательная функция для перевода типов недвижимости
const getPropertyTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'flat': 'Квартира',
    'house': 'Дом',
    'apartment': 'Апартаменты',
    'commercial': 'Коммерческая',
    'unknown': 'Не указан'
  };

  return labels[type] || type;
};