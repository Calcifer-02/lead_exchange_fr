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

        // Получаем каждый лид по отдельности
        for (const leadId of leadIds) {
          try {
            const response = await leadsAPI.getLead(leadId);
            leadsMap[leadId] = response.lead; // Извлекаем lead из response
          } catch (err) {
            console.error(`Failed to fetch lead ${leadId}:`, err);
            // Создаем заглушку для лида, который не удалось загрузить
            const fallbackLead: Lead = {
              leadId,
              title: 'Не удалось загрузить',
              description: '',
              requirement: '',
              status: 'LEAD_STATUS_UNSPECIFIED',
              contactName: '',
              contactPhone: '',
              contactEmail: '',
              ownerUserId: '',
              createdUserId: '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            leadsMap[leadId] = fallbackLead;
          }
        }

        setLeads(leadsMap);
      } catch (err) {
        console.error('Failed to fetch leads:', err);
        setError('Не удалось загрузить данные лидов');
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [leadIds.join(',')]);

  return { leads, loading, error };
};