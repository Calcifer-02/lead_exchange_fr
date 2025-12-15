import { useEffect, useState } from 'react';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  BankOutlined,
  EditOutlined,
  SaveOutlined,
  CameraOutlined,
  LockOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import {
  Typography,
  Form,
  Input,
  Button,
  message,
  Spin,
  Tag,
  Divider,
} from 'antd';
import { userAPI, leadsAPI, dealsAPI, propertiesAPI } from '../../api';
import type { User, UpdateProfileRequest } from '../../types/user';
import type { Deal } from '../../types/deals';
import { USER_ROLE_LABELS, USER_STATUS_LABELS } from '../../types/user';
import styles from './styles.module.css';

const { Title, Text } = Typography;

interface UserStats {
  totalLeads: number;
  publishedLeads: number;
  totalProperties: number;
  publishedProperties: number;
  activeDeals: number;
  completedDeals: number;
  totalRevenue: number;
}

const ProfilePage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState<UserStats>({
    totalLeads: 0,
    publishedLeads: 0,
    totalProperties: 0,
    publishedProperties: 0,
    activeDeals: 0,
    completedDeals: 0,
    totalRevenue: 0,
  });
  const [form] = Form.useForm();

  // Загрузка профиля и статистики
  useEffect(() => {
    const loadProfileAndStats = async () => {
      try {
        setLoading(true);
        const profile = await userAPI.getProfile();
        setUser(profile);

        // Сохраняем данные в localStorage для использования в других частях приложения
        localStorage.setItem('userId', profile.id);
        localStorage.setItem('userEmail', profile.email);
        localStorage.setItem('userFirstName', profile.firstName);
        localStorage.setItem('userLastName', profile.lastName);
        localStorage.setItem('userPhone', profile.phone || '');

        // Устанавливаем значения формы
        form.setFieldsValue({
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone,
          agencyName: profile.agencyName,
        });

        // Загружаем статистику
        await loadUserStats(profile.id);
      } catch {
        message.error('Не удалось загрузить профиль');
      } finally {
        setLoading(false);
      }
    };

    loadProfileAndStats();
  }, [form]);

  // Загрузка статистики пользователя
  const loadUserStats = async (userId: string) => {
    try {
      // Загружаем лиды, объекты и сделки пользователя
      const [leadsResponse, propertiesResponse, sellerDeals, buyerDeals] = await Promise.all([
        leadsAPI.listLeads({ createdUserId: userId }),
        propertiesAPI.getProperties({ createdUserId: userId }),
        dealsAPI.fetchDeals({ sellerUserId: userId }),
        dealsAPI.fetchDeals({ buyerUserId: userId }),
      ]);

      const userLeads = leadsResponse.leads || [];
      const userProperties = propertiesResponse || [];

      // Считаем опубликованные лиды
      const publishedLeads = userLeads.filter(
        (lead) => lead.status === 'LEAD_STATUS_PUBLISHED'
      );

      // Считаем опубликованные объекты
      const publishedProperties = userProperties.filter(
        (property) => property.status === 'PROPERTY_STATUS_PUBLISHED'
      );

      // Объединяем сделки (убираем дубликаты если есть)
      const allUserDeals = [...sellerDeals, ...buyerDeals];
      const uniqueDeals = allUserDeals.filter(
        (deal, index, self) => self.findIndex(d => d.dealId === deal.dealId) === index
      );

      // Считаем активные сделки (PENDING, ACCEPTED)
      const activeDeals = uniqueDeals.filter(
        (deal: Deal) =>
          deal.status === 'DEAL_STATUS_PENDING' || deal.status === 'DEAL_STATUS_ACCEPTED'
      );

      // Считаем завершённые сделки
      const completedDeals = uniqueDeals.filter(
        (deal: Deal) => deal.status === 'DEAL_STATUS_COMPLETED'
      );

      // Считаем общий оборот (сумма завершённых сделок)
      const totalRevenue = completedDeals.reduce(
        (sum: number, deal: Deal) => sum + (deal.price || 0),
        0
      );

      setStats({
        totalLeads: userLeads.length,
        publishedLeads: publishedLeads.length,
        totalProperties: userProperties.length,
        publishedProperties: publishedProperties.length,
        activeDeals: activeDeals.length,
        completedDeals: completedDeals.length,
        totalRevenue,
      });
    } catch {
      // Если не удалось загрузить статистику, оставляем нули
    }
  };

  // Сохранение профиля
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      // Формируем объект только с непустыми значениями
      const updateData: UpdateProfileRequest = {};

      if (values.firstName && values.firstName.trim()) {
        updateData.firstName = values.firstName.trim();
      }
      if (values.lastName && values.lastName.trim()) {
        updateData.lastName = values.lastName.trim();
      }
      if (values.phone && values.phone.trim()) {
        // Отправляем телефон без форматирования
        updateData.phone = values.phone.replace(/[^\d+]/g, '');
      }
      if (values.agencyName && values.agencyName.trim()) {
        updateData.agencyName = values.agencyName.trim();
      }

      console.log('Отправляем данные для обновления профиля:', updateData);

      const updatedUser = await userAPI.updateProfile(updateData);
      setUser(updatedUser);

      // Обновляем localStorage
      localStorage.setItem('userFirstName', updatedUser.firstName);
      localStorage.setItem('userLastName', updatedUser.lastName);
      localStorage.setItem('userPhone', updatedUser.phone || '');

      message.success('Профиль успешно обновлён');
      setEditing(false);
    } catch (error) {
      console.error('Ошибка при сохранении профиля:', error);
      // Попробуем получить детали ошибки
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        const errorMessage = axiosError.response?.data?.message || 'Не удалось сохранить изменения';
        message.error(errorMessage);
      } else {
        message.error('Не удалось сохранить изменения');
      }
    } finally {
      setSaving(false);
    }
  };

  // Отмена редактирования
  const handleCancel = () => {
    if (user) {
      form.setFieldsValue({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        agencyName: user.agencyName,
      });
    }
    setEditing(false);
  };

  // Получение класса для бейджа статуса
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'USER_STATUS_ACTIVE':
        return styles.profileBadgeActive;
      case 'USER_STATUS_BANNED':
        return styles.profileBadgeBanned;
      case 'USER_STATUS_SUSPENDED':
        return styles.profileBadgeSuspended;
      default:
        return '';
    }
  };

  // Форматирование телефона
  const formatPhone = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const limitedNumber = phoneNumber.slice(0, 11);

    if (limitedNumber.length === 0) return '';
    if (limitedNumber.length === 1) return `+7`;
    if (limitedNumber.length <= 4) return `+7 (${limitedNumber.slice(1)}`;
    if (limitedNumber.length <= 7) return `+7 (${limitedNumber.slice(1, 4)}) ${limitedNumber.slice(4)}`;
    if (limitedNumber.length <= 9) return `+7 (${limitedNumber.slice(1, 4)}) ${limitedNumber.slice(4, 7)}-${limitedNumber.slice(7)}`;
    return `+7 (${limitedNumber.slice(1, 4)}) ${limitedNumber.slice(4, 7)}-${limitedNumber.slice(7, 9)}-${limitedNumber.slice(9, 11)}`;
  };

  // Форматирование денежных сумм
  const formatMoney = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M ₽`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K ₽`;
    }
    return `${value} ₽`;
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <Spin size="large" />
          <span className={styles.loadingText}>Загрузка профиля...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <Text type="secondary">Не удалось загрузить профиль</Text>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.pageHeader}>
        <Title level={2} className={styles.pageTitle}>
          Профиль
        </Title>
      </header>

      {/* Profile Header Card */}
      <div className={styles.profileHeader}>
        <div className={styles.avatarWrapper}>
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="Avatar" className={styles.avatar} />
          ) : (
            <div className={styles.avatarPlaceholder}>
              <UserOutlined />
            </div>
          )}
          <div className={styles.avatarUpload}>
            <CameraOutlined />
          </div>
        </div>

        <div className={styles.profileInfo}>
          <Title level={3} className={styles.profileName}>
            {user.firstName} {user.lastName}
          </Title>
          <div className={styles.profileEmail}>
            <MailOutlined />
            {user.email}
          </div>
          <div className={styles.profileMeta}>
            <span className={`${styles.profileBadge} ${getStatusBadgeClass(user.status)}`}>
              <CheckCircleOutlined />
              {USER_STATUS_LABELS[user.status]}
            </span>
            <span className={styles.profileBadge}>
              <SafetyOutlined />
              {USER_ROLE_LABELS[user.role]}
            </span>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className={styles.card}>
        <Title level={4} className={styles.cardTitle}>
          <UserOutlined className={styles.cardIcon} />
          Личная информация
        </Title>

        <Form form={form} layout="vertical" disabled={!editing}>
          <div className={styles.formSection}>
            <div className={styles.fieldRow}>
              <Form.Item
                name="firstName"
                label="Имя"
                rules={[{ required: true, message: 'Введите имя' }]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: '#6b778c' }} />}
                  placeholder="Иван"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="lastName"
                label="Фамилия"
                rules={[{ required: true, message: 'Введите фамилию' }]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: '#6b778c' }} />}
                  placeholder="Иванов"
                  size="large"
                />
              </Form.Item>
            </div>

            <div className={styles.fieldRow}>
              <Form.Item
                name="phone"
                label="Телефон"
                rules={[{ required: true, message: 'Введите телефон' }]}
              >
                <Input
                  prefix={<PhoneOutlined style={{ color: '#6b778c' }} />}
                  placeholder="+7 (999) 123-45-67"
                  size="large"
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value);
                    form.setFieldsValue({ phone: formatted });
                  }}
                />
              </Form.Item>

              <Form.Item
                name="agencyName"
                label="Название агентства"
              >
                <Input
                  prefix={<BankOutlined style={{ color: '#6b778c' }} />}
                  placeholder="ООО Недвижимость"
                  size="large"
                />
              </Form.Item>
            </div>
          </div>
        </Form>

        {/* Email (read-only) */}
        <Divider />
        <div className={styles.formSection}>
          <div>
            <span className={styles.fieldLabel}>Email</span>
            <div className={styles.fieldValue}>
              <MailOutlined style={{ marginRight: 8 }} />
              {user.email}
              <Tag color="blue" style={{ marginLeft: 8 }}>Подтверждён</Tag>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {editing ? (
            <>
              <Button
                size="large"
                className={styles.secondaryButton}
                onClick={handleCancel}
              >
                Отмена
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={handleSave}
              >
                Сохранить изменения
              </Button>
            </>
          ) : (
            <Button
              type="primary"
              size="large"
              icon={<EditOutlined />}
              onClick={() => setEditing(true)}
            >
              Редактировать
            </Button>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className={styles.card}>
        <Title level={4} className={styles.cardTitle}>
          <SafetyOutlined className={styles.cardIcon} />
          Статистика
        </Title>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.totalLeads}</div>
            <div className={styles.statLabel}>Всего лидов</div>
            <div className={styles.statSub}>{stats.publishedLeads} опубликовано</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.totalProperties}</div>
            <div className={styles.statLabel}>Всего объектов</div>
            <div className={styles.statSub}>{stats.publishedProperties} опубликовано</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.activeDeals}</div>
            <div className={styles.statLabel}>Активных сделок</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.completedDeals}</div>
            <div className={styles.statLabel}>Завершённых сделок</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{formatMoney(stats.totalRevenue)}</div>
            <div className={styles.statLabel}>Общий оборот</div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className={styles.card}>
        <Title level={4} className={styles.cardTitle}>
          <LockOutlined className={styles.cardIcon} />
          Безопасность
        </Title>

        <div className={styles.securityItem}>
          <div className={styles.securityInfo}>
            <span className={styles.securityTitle}>Пароль</span>
            <span className={styles.securityDescription}>
              Последнее изменение: неизвестно
            </span>
          </div>
          <Button type="link">Изменить пароль</Button>
        </div>

        <div className={styles.securityItem}>
          <div className={styles.securityInfo}>
            <span className={styles.securityTitle}>Двухфакторная аутентификация</span>
            <span className={styles.securityDescription}>
              Дополнительная защита вашего аккаунта
            </span>
          </div>
          <Button type="link">Настроить</Button>
        </div>

        <div className={styles.securityItem}>
          <div className={styles.securityInfo}>
            <span className={styles.securityTitle}>Активные сессии</span>
            <span className={styles.securityDescription}>
              Управление устройствами, с которых выполнен вход
            </span>
          </div>
          <Button type="link">Просмотреть</Button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className={styles.card}>
        <Title level={4} className={styles.cardTitle} style={{ color: '#dc2626' }}>
          <SafetyOutlined className={styles.cardIcon} style={{ color: '#dc2626' }} />
          Опасная зона
        </Title>

        <div className={styles.securityItem}>
          <div className={styles.securityInfo}>
            <span className={styles.securityTitle}>Удалить аккаунт</span>
            <span className={styles.securityDescription}>
              Удаление аккаунта необратимо. Все ваши данные будут удалены.
            </span>
          </div>
          <Button className={styles.dangerButton}>Удалить аккаунт</Button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

