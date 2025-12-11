/**
 * Утилиты для работы с полем requirement лида
 *
 * Поле requirement может быть:
 * 1. Base64-encoded JSON (новый формат с фронтенда)
 * 2. Обычный JSON строка (старые данные в БД)
 * 3. Уже распарсенный объект
 */

export interface RequirementData {
  // Локация
  city: string;
  address: string;
  district?: string;
  region?: string;

  // Характеристики объекта
  price: number;
  area: number;
  rooms: number;
  floor: number;
  floorsTotal: number;

  // Тип
  propertyType: string;
  dealType: string;
  buildingType: string;

  // Медиа
  photos: string[];

  // Дополнительно
  rating?: number;
  tags?: string[];
  phone?: string;
  email?: string;

  // Для новых лидов (запросы клиентов)
  extractedFromDescription?: boolean;
  rawDescription?: string;

  // Любые дополнительные поля
  [key: string]: unknown;
}

/**
 * Дефолтные значения для requirement
 */
export const DEFAULT_REQUIREMENT: RequirementData = {
  city: '',
  address: '',
  price: 0,
  area: 0,
  rooms: 0,
  floor: 0,
  floorsTotal: 0,
  propertyType: 'flat',
  dealType: 'sale',
  buildingType: 'secondary',
  photos: [],
};

/**
 * Парсит поле requirement из разных форматов
 */
export const parseRequirement = (requirement: string | object | null | undefined): RequirementData => {
  if (!requirement) {
    return { ...DEFAULT_REQUIREMENT };
  }

  // Если это уже объект
  if (typeof requirement === 'object') {
    return normalizeRequirementData(requirement as Record<string, unknown>);
  }

  // Пробуем разные способы парсинга строки
  let data: Record<string, unknown> | null = null;

  // Способ 1: Base64-encoded JSON (новый формат)
  try {
    const decoded = decodeURIComponent(escape(atob(requirement)));
    data = JSON.parse(decoded);
  } catch {
    // Не base64, пробуем другой способ
  }

  // Способ 2: Обычный JSON (старый формат)
  if (!data) {
    try {
      data = JSON.parse(requirement);
    } catch {
      // Не JSON
    }
  }

  // Способ 3: Попробуем как простую строку описания
  if (!data) {
    return {
      ...DEFAULT_REQUIREMENT,
      rawDescription: requirement,
    };
  }

  return normalizeRequirementData(data);
};

/**
 * Нормализует данные requirement к единому формату
 * Поддерживает разные названия полей из старых данных
 */
const normalizeRequirementData = (data: Record<string, unknown>): RequirementData => {
  return {
    // Локация - поддерживаем разные варианты названий
    city: String(data.city || data.district || data.region || ''),
    address: String(data.address || ''),
    district: data.district ? String(data.district) : undefined,
    region: data.region ? String(data.region) : undefined,

    // Цена - preferredPrice из старых данных
    price: parseNumber(data.price || data.preferredPrice),

    // Площадь - может быть строкой "15 соток"
    area: parseArea(data.area),

    // Комнаты - roomNumber из старых данных
    rooms: parseNumber(data.rooms || data.roomNumber),

    // Этаж
    floor: parseNumber(data.floor),
    floorsTotal: parseNumber(data.floorsTotal || data.totalFloors),

    // Типы
    propertyType: String(data.propertyType || detectPropertyType(data) || 'flat'),
    dealType: String(data.dealType || 'sale'),
    buildingType: String(data.buildingType || 'secondary'),

    // Медиа
    photos: Array.isArray(data.photos) ? data.photos.map(String) : [],

    // Дополнительно
    rating: data.rating ? Number(data.rating) : undefined,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : undefined,
    phone: data.phone ? String(data.phone) : undefined,
    email: data.email ? String(data.email) : undefined,

    // Для ML-лидов
    extractedFromDescription: Boolean(data.extractedFromDescription),
    rawDescription: data.rawDescription ? String(data.rawDescription) : undefined,
  };
};

/**
 * Парсит число из разных форматов
 */
const parseNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Убираем пробелы и нечисловые символы
    const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

/**
 * Парсит площадь из разных форматов (может быть "15 соток", "65.5 м²" и т.д.)
 */
const parseArea = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Проверяем на сотки
    const sotokMatch = value.match(/(\d+(?:[.,]\d+)?)\s*сот/i);
    if (sotokMatch) {
      return parseFloat(sotokMatch[1].replace(',', '.')) * 100; // Конвертируем в м²
    }
    // Обычные числа
    return parseNumber(value);
  }
  return 0;
};

/**
 * Пытается определить тип недвижимости из контекста
 */
const detectPropertyType = (data: Record<string, unknown>): string | null => {
  const text = JSON.stringify(data).toLowerCase();

  if (text.includes('участок') || text.includes('сотк')) return 'land';
  if (text.includes('дом')) return 'house';
  if (text.includes('апартамент')) return 'apartment';
  if (text.includes('коммерч') || text.includes('офис')) return 'commercial';
  if (text.includes('квартир')) return 'flat';

  return null;
};

/**
 * Кодирует requirement в base64 для отправки на сервер
 */
export const encodeRequirement = (data: Partial<RequirementData>): string => {
  const json = JSON.stringify(data);
  return btoa(unescape(encodeURIComponent(json)));
};

/**
 * Форматирует цену для отображения
 */
export const formatPrice = (price: number): string => {
  if (!price) return '—';
  return new Intl.NumberFormat('ru-RU').format(price);
};

/**
 * Форматирует площадь для отображения
 */
export const formatArea = (area: number): string => {
  if (!area) return '—';
  return `${area} м²`;
};

/**
 * Возвращает лейбл типа недвижимости
 */
export const getPropertyTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    flat: 'Квартира',
    house: 'Дом',
    apartment: 'Апартаменты',
    commercial: 'Коммерческая',
    land: 'Участок',
  };
  return labels[type] || type || 'Не указан';
};

/**
 * Возвращает лейбл типа сделки
 */
export const getDealTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    sale: 'Продажа',
    rent: 'Аренда',
  };
  return labels[type] || type || 'Не указан';
};

/**
 * Возвращает лейбл типа дома
 */
export const getBuildingTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    new: 'Новостройка',
    secondary: 'Вторичка',
  };
  return labels[type] || type || 'Не указан';
};

