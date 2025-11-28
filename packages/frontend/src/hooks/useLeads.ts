import { useState, useEffect } from 'react';
import { leadsAPI } from '../api';
import type { Lead } from '../types';

export const useLeads = (leadIds: string[]) => {
  const [leads, setLeads] = useState<Record<string, Lead>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeads = async () => {
      if (leadIds.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const leadsMap: Record<string, Lead> = {};

        // Загружаем все лиды параллельно для ускорения
        const leadsPromises = leadIds.map(async (leadId) => {
          try {
            const response = await leadsAPI.getLead(leadId);
            return { leadId, lead: response.lead };
          } catch {
            // Создаем заглушку для лида, который не удалось загрузить
            return {
              leadId,
              lead: {
                leadId,
                title: 'Не удалось загрузить',
                description: '',
                requirement: '',
                status: 'LEAD_STATUS_UNSPECIFIED' as const,
                contactName: '',
                contactPhone: '',
                contactEmail: '',
                ownerUserId: '',
                createdUserId: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            };
          }
        });

        const leadsResults = await Promise.all(leadsPromises);

        // Заполняем map результатами
        leadsResults.forEach(({ leadId, lead }) => {
          leadsMap[leadId] = lead;
        });

        setLeads(leadsMap);
      } catch {
        setError('Не удалось загрузить данные лидов');
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [leadIds.join(',')]);

  return { leads, loading, error };
};