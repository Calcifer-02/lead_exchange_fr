/**
 * Утилиты для маскировки контактной информации
 * Используется для скрытия контактов продавца до покупки лида
 */

/**
 * Маскирует телефонный номер, оставляя только первые 4 и последние 2 символа
 * Пример: +7 (999) 123-45-67 -> +7 (9** *** **-67
 */
export const maskPhone = (phone: string): string => {
  if (!phone) return '***********';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6) return '*'.repeat(phone.length);

  // Показываем только код страны и последние 2 цифры
  const countryCode = digits.slice(0, 1);
  const lastTwo = digits.slice(-2);
  const middleLength = digits.length - 3;

  return `+${countryCode} ${'*'.repeat(middleLength)}${lastTwo}`;
};

/**
 * Маскирует email, показывая только первые 2 буквы и домен верхнего уровня
 * Пример: example@gmail.com -> ex***@***.com
 */
export const maskEmail = (email: string): string => {
  if (!email) return '***@***.***';

  const [localPart, domain] = email.split('@');
  if (!domain) return '***@***.***';

  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];

  const maskedLocal = localPart.slice(0, 2) + '***';
  const maskedDomain = '***.' + tld;

  return `${maskedLocal}@${maskedDomain}`;
};

/**
 * Маскирует имя, показывая только первую букву
 * Пример: Иван Петров -> И***
 */
export const maskName = (name: string): string => {
  if (!name) return '***';
  return name.charAt(0) + '***';
};

/**
 * Генерирует заглушку контакта для защиты от просмотра через консоль
 * Реальные данные не передаются на фронтенд
 */
export const getProtectedContact = (type: 'phone' | 'email' | 'name'): string => {
  switch (type) {
    case 'phone':
      return '+7 (***) ***-**-**';
    case 'email':
      return '***@***.***';
    case 'name':
      return 'Скрыто до покупки';
    default:
      return '***';
  }
};

/**
 * Проверяет, доступны ли контакты лида для текущего пользователя
 * @param leadStatus - статус лида
 * @param leadOwnerId - ID владельца лида
 * @param currentUserId - ID текущего пользователя
 * @param buyerId - ID покупателя (если лид куплен)
 */
export const areContactsVisible = (
  leadStatus: string,
  leadOwnerId: string,
  currentUserId: string | null,
  buyerId?: string
): boolean => {
  // Владелец всегда видит свои контакты
  if (currentUserId && leadOwnerId === currentUserId) {
    return true;
  }

  // Покупатель видит контакты после покупки
  if (currentUserId && buyerId === currentUserId) {
    return true;
  }

  // Если лид куплен текущим пользователем
  if (leadStatus === 'LEAD_STATUS_PURCHASED' && buyerId === currentUserId) {
    return true;
  }

  return false;
};

