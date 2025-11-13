import { useState, useCallback } from 'react';
import { mlApi } from '../api/mlService';
import type { Property, Requirements, MatchRequest } from '../types/ml';

export const useMLMatching = () => {
  const [matches, setMatches] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [similarityScores, setSimilarityScores] = useState<number[]>([]);

  // Поиск matches с ML
  const findMatches = useCallback(async (requirements: Requirements, k: number = 10) => {
    setLoading(true);
    setError(null);

    try {
      const request: MatchRequest = {
        requirements,
        k
      };

      const response = await mlApi.findMatches(request);
      setMatches(response.matches);
      setSimilarityScores(response.distances || []);

      return response;
    } catch {
      const errorMessage = 'Ошибка ML-матчинга';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Добавление объекта в ML-систему
  const addProperty = useCallback(async (property: Omit<Property, 'id'>) => {
    try {
      const result = await mlApi.addProperty(property);
      return result;
    } catch {
      const errorMessage = 'Ошибка добавления объекта';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Удаление объекта из ML-системы
  const deleteProperty = useCallback(async (propertyId: string) => {
    try {
      const result = await mlApi.deleteProperty(propertyId);
      return result;
    } catch {
      const errorMessage = 'Ошибка удаления объекта';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Проверка здоровья ML-сервиса
  const checkHealth = useCallback(async () => {
    try {
      return await mlApi.healthCheck();
    } catch {
      setError('ML-сервис недоступен');
      return null;
    }
  }, []);

  // Преобразование ML-расстояния в процент сходства
  const getSimilarityPercentage = (distance: number): number => {
    // Преобразуем евклидово расстояние в процент сходства (0-100%)
    // Чем меньше расстояние, тем выше сходство
    const maxDistance = 10; // Максимальное ожидаемое расстояние
    const similarity = Math.max(0, 100 - (distance / maxDistance) * 100);
    return Math.round(similarity);
  };

  return {
    matches,
    loading,
    error,
    similarityScores,
    findMatches,
    addProperty,
    deleteProperty,
    checkHealth,
    getSimilarityPercentage
  };
};