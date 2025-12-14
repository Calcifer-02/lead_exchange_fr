import { useEffect, useState, useCallback } from 'react';
import {
  UserOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  StopOutlined,
  PauseCircleOutlined,
  MailOutlined,
  PhoneOutlined,
  BankOutlined,
  CrownOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  HomeOutlined,
  EnvironmentOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import {
  Typography,
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Modal,
  message,
  Card,
  Row,
  Col,
  Statistic,
  Tooltip,
  Avatar,
  Form,
  Dropdown,
  Tabs,
  Descriptions,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { userAPI, leadsAPI, propertiesAPI } from '../../api';
import type { User, UserRole, UserStatus, ListUsersFilter } from '../../types/user';
import { USER_ROLE_LABELS, USER_STATUS_LABELS, USER_STATUS_COLORS } from '../../types/user';
import type { Lead, LeadStatus } from '../../types/leads';
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from '../../types/leads';
import type { Property, PropertyStatus, PropertyType } from '../../types/properties';
import { PROPERTY_TYPE_LABELS, PROPERTY_STATUS_LABELS } from '../../types/properties';
import styles from './styles.module.css';

const { Title, Text } = Typography;
const { Option } = Select;

// Статистика по пользователям
interface UsersStats {
  total: number;
  active: number;
  banned: number;
  suspended: number;
  admins: number;
}

// Статистика по лидам
interface LeadsStats {
  total: number;
  pending: number;
  published: number;
  purchased: number;
}

// Статистика по объектам недвижимости
interface PropertiesStats {
  total: number;
  pending: number;
  published: number;
  sold: number;
}

// Цвета для статусов объектов
const PROPERTY_STATUS_COLORS: Record<PropertyStatus, { text: string; bg: string; border: string }> = {
  PROPERTY_STATUS_UNSPECIFIED: { text: '#8c8c8c', bg: '#fafafa', border: '#d9d9d9' },
  PROPERTY_STATUS_NEW: { text: '#D97706', bg: '#FEF3C7', border: '#FCD34D' },
  PROPERTY_STATUS_PUBLISHED: { text: '#059669', bg: '#D1FAE5', border: '#6EE7B7' },
  PROPERTY_STATUS_SOLD: { text: '#7C3AED', bg: '#EDE9FE', border: '#C4B5FD' },
  PROPERTY_STATUS_DELETED: { text: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' },
};

const AdminPage = () => {
  // Активная вкладка
  const [activeTab, setActiveTab] = useState('users');

  // Состояния для пользователей
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<UserStatus | undefined>(undefined);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [newStatus, setNewStatus] = useState<UserStatus | undefined>(undefined);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [stats, setStats] = useState<UsersStats>({
    total: 0,
    active: 0,
    banned: 0,
    suspended: 0,
    admins: 0,
  });

  // Состояния для лидов
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsSearchText, setLeadsSearchText] = useState('');
  const [leadsStatusFilter, setLeadsStatusFilter] = useState<LeadStatus | undefined>(undefined);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadDetailVisible, setLeadDetailVisible] = useState(false);
  const [updatingLead, setUpdatingLead] = useState(false);
  const [leadsStats, setLeadsStats] = useState<LeadsStats>({
    total: 0,
    pending: 0,
    published: 0,
    purchased: 0,
  });

  // Состояния для объектов недвижимости
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [propertiesSearchText, setPropertiesSearchText] = useState('');
  const [propertiesStatusFilter, setPropertiesStatusFilter] = useState<PropertyStatus | undefined>(undefined);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propertyDetailVisible, setPropertyDetailVisible] = useState(false);
  const [updatingProperty, setUpdatingProperty] = useState(false);
  const [propertiesStats, setPropertiesStats] = useState<PropertiesStats>({
    total: 0,
    pending: 0,
    published: 0,
    sold: 0,
  });

  // Загрузка списка лидов
  const loadLeads = useCallback(async () => {
    try {
      setLeadsLoading(true);
      const response = await leadsAPI.listLeads({
        status: leadsStatusFilter,
      });
      const leadsList = response.leads || [];
      setLeads(leadsList);

      // Рассчитываем статистику
      const statsData: LeadsStats = {
        total: leadsList.length,
        pending: leadsList.filter(l => l.status === 'LEAD_STATUS_NEW').length,
        published: leadsList.filter(l => l.status === 'LEAD_STATUS_PUBLISHED').length,
        purchased: leadsList.filter(l => l.status === 'LEAD_STATUS_PURCHASED').length,
      };
      setLeadsStats(statsData);
    } catch (error) {
      console.error('Failed to load leads:', error);
      message.error('Не удалось загрузить список лидов');
    } finally {
      setLeadsLoading(false);
    }
  }, [leadsStatusFilter]);

  // Одобрить лид (опубликовать)
  const handleApproveLead = async (lead: Lead) => {
    try {
      setUpdatingLead(true);
      await leadsAPI.updateLead(lead.leadId, {
        status: 'LEAD_STATUS_PUBLISHED',
      });
      message.success('Лид опубликован');
      loadLeads();
    } catch (error) {
      console.error('Failed to approve lead:', error);
      message.error('Не удалось опубликовать лид');
    } finally {
      setUpdatingLead(false);
    }
  };

  // Отклонить лид (удалить)
  const handleRejectLead = async (lead: Lead) => {
    Modal.confirm({
      title: 'Отклонить лид?',
      content: `Вы уверены, что хотите отклонить лид "${lead.title}"?`,
      okText: 'Отклонить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          setUpdatingLead(true);
          await leadsAPI.updateLead(lead.leadId, {
            status: 'LEAD_STATUS_DELETED',
          });
          message.success('Лид отклонён');
          loadLeads();
        } catch (error) {
          console.error('Failed to reject lead:', error);
          message.error('Не удалось отклонить лид');
        } finally {
          setUpdatingLead(false);
        }
      },
    });
  };

  // Загрузка списка объектов недвижимости
  const loadProperties = useCallback(async () => {
    try {
      setPropertiesLoading(true);
      const propertiesList = await propertiesAPI.getProperties({
        status: propertiesStatusFilter,
      });

      setProperties(propertiesList || []);

      // Рассчитываем статистику
      const statsData: PropertiesStats = {
        total: propertiesList.length,
        pending: propertiesList.filter(p => p.status === 'PROPERTY_STATUS_NEW').length,
        published: propertiesList.filter(p => p.status === 'PROPERTY_STATUS_PUBLISHED').length,
        sold: propertiesList.filter(p => p.status === 'PROPERTY_STATUS_SOLD').length,
      };
      setPropertiesStats(statsData);
    } catch (error) {
      console.error('Failed to load properties:', error);
      message.error('Не удалось загрузить список объектов');
    } finally {
      setPropertiesLoading(false);
    }
  }, [propertiesStatusFilter]);

  // Одобрить объект (опубликовать)
  const handleApproveProperty = async (property: Property) => {
    try {
      setUpdatingProperty(true);
      await propertiesAPI.updateProperty(property.propertyId, {
        status: 'PROPERTY_STATUS_PUBLISHED',
      });
      message.success('Объект опубликован');
      loadProperties();
    } catch (error) {
      console.error('Failed to approve property:', error);
      message.error('Не удалось опубликовать объект');
    } finally {
      setUpdatingProperty(false);
    }
  };

  // Отклонить объект (удалить)
  const handleRejectProperty = async (property: Property) => {
    Modal.confirm({
      title: 'Отклонить объект?',
      content: `Вы уверены, что хотите отклонить объект "${property.title}"?`,
      okText: 'Отклонить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          setUpdatingProperty(true);
          await propertiesAPI.updateProperty(property.propertyId, {
            status: 'PROPERTY_STATUS_DELETED',
          });
          message.success('Объект отклонён');
          loadProperties();
        } catch (error) {
          console.error('Failed to reject property:', error);
          message.error('Не удалось отклонить объект');
        } finally {
          setUpdatingProperty(false);
        }
      },
    });
  };

  // Изменить статус объекта
  const handleChangePropertyStatus = async (property: Property, newStatus: PropertyStatus) => {
    try {
      setUpdatingProperty(true);
      await propertiesAPI.updateProperty(property.propertyId, {
        status: newStatus,
      });
      message.success('Статус объекта изменён');
      loadProperties();
    } catch (error) {
      console.error('Failed to update property status:', error);
      message.error('Не удалось изменить статус объекта');
    } finally {
      setUpdatingProperty(false);
    }
  };

  // Загрузка списка пользователей
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const filter: ListUsersFilter = {};

      if (roleFilter) {
        filter.role = roleFilter;
      }
      if (statusFilter) {
        filter.status = statusFilter;
      }

      const response = await userAPI.listUsers(filter);
      const usersList = response.users || [];
      setUsers(usersList);

      // Рассчитываем статистику
      const statsData: UsersStats = {
        total: usersList.length,
        active: usersList.filter(u => u.status === 'USER_STATUS_ACTIVE').length,
        banned: usersList.filter(u => u.status === 'USER_STATUS_BANNED').length,
        suspended: usersList.filter(u => u.status === 'USER_STATUS_SUSPENDED').length,
        admins: usersList.filter(u => u.role === 'USER_ROLE_ADMIN').length,
      };
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load users:', error);
      message.error('Не удалось загрузить список пользователей');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Загрузка лидов при смене вкладки
  useEffect(() => {
    if (activeTab === 'leads') {
      loadLeads();
    }
  }, [activeTab, loadLeads]);

  // Загрузка объектов при смене вкладки
  useEffect(() => {
    if (activeTab === 'properties') {
      loadProperties();
    }
  }, [activeTab, loadProperties]);

  // Обработчик изменения статуса
  const handleStatusChange = async () => {
    if (!selectedUser || !newStatus) return;

    try {
      setUpdatingStatus(true);
      await userAPI.updateUserStatus(selectedUser.id, { status: newStatus });
      message.success(`Статус пользователя ${selectedUser.email} успешно изменён`);
      setStatusModalVisible(false);
      setSelectedUser(null);
      setNewStatus(undefined);
      loadUsers();
    } catch (error) {
      console.error('Failed to update user status:', error);
      message.error('Не удалось изменить статус пользователя');
    } finally {
      setUpdatingStatus(false);
    }
  };


  // Фильтрация пользователей по поисковому запросу
  const filteredUsers = users.filter(user => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    return (
      user.email?.toLowerCase().includes(search) ||
      user.firstName?.toLowerCase().includes(search) ||
      user.lastName?.toLowerCase().includes(search) ||
      user.phone?.toLowerCase().includes(search) ||
      user.agencyName?.toLowerCase().includes(search)
    );
  });

  // Получение цвета для статуса
  const getStatusColor = (status: UserStatus) => {
    return USER_STATUS_COLORS[status] || USER_STATUS_COLORS.USER_STATUS_UNSPECIFIED;
  };

  // Получение иконки для статуса
  const getStatusIcon = (status: UserStatus) => {
    switch (status) {
      case 'USER_STATUS_ACTIVE':
        return <CheckCircleOutlined />;
      case 'USER_STATUS_BANNED':
        return <StopOutlined />;
      case 'USER_STATUS_SUSPENDED':
        return <PauseCircleOutlined />;
      default:
        return null;
    }
  };

  // Меню действий для пользователя
  const getActionMenu = (user: User): MenuProps['items'] => [
    {
      key: 'activate',
      label: 'Активировать',
      icon: <CheckCircleOutlined style={{ color: '#059669' }} />,
      disabled: user.status === 'USER_STATUS_ACTIVE',
      onClick: () => {
        setSelectedUser(user);
        setNewStatus('USER_STATUS_ACTIVE');
        setStatusModalVisible(true);
      },
    },
    {
      key: 'suspend',
      label: 'Приостановить',
      icon: <PauseCircleOutlined style={{ color: '#D97706' }} />,
      disabled: user.status === 'USER_STATUS_SUSPENDED',
      onClick: () => {
        setSelectedUser(user);
        setNewStatus('USER_STATUS_SUSPENDED');
        setStatusModalVisible(true);
      },
    },
    {
      key: 'ban',
      label: 'Заблокировать',
      icon: <StopOutlined style={{ color: '#DC2626' }} />,
      disabled: user.status === 'USER_STATUS_BANNED',
      onClick: () => {
        setSelectedUser(user);
        setNewStatus('USER_STATUS_BANNED');
        setStatusModalVisible(true);
      },
    },
  ];

  // Колонки таблицы
  const columns: ColumnsType<User> = [
    {
      title: 'Пользователь',
      key: 'user',
      width: 280,
      render: (_, record) => (
        <div className={styles.userCell}>
          <Avatar
            size={40}
            src={record.avatarUrl}
            icon={!record.avatarUrl && <UserOutlined />}
            className={styles.userAvatar}
          />
          <div className={styles.userInfo}>
            <Text strong className={styles.userName}>
              {record.firstName && record.lastName
                ? `${record.firstName} ${record.lastName}`
                : 'Имя не указано'}
              {record.role === 'USER_ROLE_ADMIN' && (
                <Tooltip title="Администратор">
                  <CrownOutlined className={styles.adminIcon} />
                </Tooltip>
              )}
            </Text>
            <Text type="secondary" className={styles.userEmail}>
              <MailOutlined /> {record.email}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Телефон',
      dataIndex: 'phone',
      key: 'phone',
      width: 160,
      render: (phone: string) => (
        phone ? (
          <Space>
            <PhoneOutlined />
            <Text>{phone}</Text>
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        )
      ),
    },
    {
      title: 'Агентство',
      dataIndex: 'agencyName',
      key: 'agencyName',
      width: 180,
      render: (agencyName: string) => (
        agencyName ? (
          <Space>
            <BankOutlined />
            <Text>{agencyName}</Text>
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        )
      ),
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
      width: 140,
      render: (role: UserRole) => (
        <Tag color={role === 'USER_ROLE_ADMIN' ? 'purple' : 'blue'}>
          {USER_ROLE_LABELS[role] || role}
        </Tag>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: UserStatus) => {
        const colors = getStatusColor(status);
        return (
          <Tag
            icon={getStatusIcon(status)}
            style={{
              color: colors.text,
              backgroundColor: colors.bg,
              borderColor: colors.border,
            }}
          >
            {USER_STATUS_LABELS[status] || status}
          </Tag>
        );
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Dropdown menu={{ items: getActionMenu(record) }} trigger={['click']}>
          <Button type="link">Изменить</Button>
        </Dropdown>
      ),
    },
  ];

  // Фильтрация лидов
  const filteredLeads = leads.filter(lead => {
    if (leadsSearchText) {
      const searchLower = leadsSearchText.toLowerCase();
      return (
        lead.title.toLowerCase().includes(searchLower) ||
        lead.description.toLowerCase().includes(searchLower) ||
        lead.contactName.toLowerCase().includes(searchLower) ||
        lead.contactEmail?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Колонки таблицы лидов
  const leadsColumns: ColumnsType<Lead> = [
    {
      title: 'Название',
      dataIndex: 'title',
      key: 'title',
      width: 250,
      render: (title: string, record) => (
        <div>
          <Text strong>{title}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.description?.substring(0, 50)}
            {record.description?.length > 50 ? '...' : ''}
          </Text>
        </div>
      ),
    },
    {
      title: 'Контакт',
      key: 'contact',
      width: 200,
      render: (_, record) => (
        <div>
          <div>
            <UserOutlined style={{ marginRight: 8 }} />
            <Text>{record.contactName}</Text>
          </div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            <PhoneOutlined style={{ marginRight: 8 }} />
            {record.contactPhone}
          </div>
        </div>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: LeadStatus) => {
        const colors = LEAD_STATUS_COLORS[status];
        return (
          <Tag
            style={{
              color: colors.text,
              backgroundColor: colors.bg,
              borderColor: colors.border,
            }}
          >
            {LEAD_STATUS_LABELS[status] || status}
          </Tag>
        );
      },
    },
    {
      title: 'Дата создания',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (date: string) => (
        <Text type="secondary">
          {new Date(date).toLocaleDateString('ru-RU')}
        </Text>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Просмотреть">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedLead(record);
                setLeadDetailVisible(true);
              }}
            />
          </Tooltip>
          {record.status === 'LEAD_STATUS_NEW' && (
            <>
              <Tooltip title="Опубликовать">
                <Button
                  type="text"
                  icon={<CheckOutlined style={{ color: '#059669' }} />}
                  onClick={() => handleApproveLead(record)}
                  loading={updatingLead}
                />
              </Tooltip>
              <Tooltip title="Отклонить">
                <Button
                  type="text"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => handleRejectLead(record)}
                  loading={updatingLead}
                />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  // Фильтрация объектов
  const filteredProperties = properties.filter(property => {
    if (propertiesSearchText) {
      const searchLower = propertiesSearchText.toLowerCase();
      return (
        property.title.toLowerCase().includes(searchLower) ||
        property.description?.toLowerCase().includes(searchLower) ||
        property.address?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Меню действий для объекта
  const getPropertyActionMenu = (property: Property): MenuProps['items'] => [
    {
      key: 'publish',
      label: 'Опубликовать',
      icon: <CheckCircleOutlined style={{ color: '#059669' }} />,
      disabled: property.status === 'PROPERTY_STATUS_PUBLISHED',
      onClick: () => handleChangePropertyStatus(property, 'PROPERTY_STATUS_PUBLISHED'),
    },
    {
      key: 'unpublish',
      label: 'Снять с публикации',
      icon: <PauseCircleOutlined style={{ color: '#D97706' }} />,
      disabled: property.status === 'PROPERTY_STATUS_NEW',
      onClick: () => handleChangePropertyStatus(property, 'PROPERTY_STATUS_NEW'),
    },
    {
      key: 'sold',
      label: 'Отметить как проданный',
      icon: <DollarOutlined style={{ color: '#7C3AED' }} />,
      disabled: property.status === 'PROPERTY_STATUS_SOLD',
      onClick: () => handleChangePropertyStatus(property, 'PROPERTY_STATUS_SOLD'),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: 'Удалить',
      icon: <CloseOutlined style={{ color: '#DC2626' }} />,
      danger: true,
      onClick: () => handleRejectProperty(property),
    },
  ];

  // Колонки таблицы объектов
  const propertiesColumns: ColumnsType<Property> = [
    {
      title: 'Объект',
      key: 'property',
      width: 300,
      render: (_, record) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HomeOutlined style={{ color: '#1890ff' }} />
            <Text strong>{record.title}</Text>
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.description?.substring(0, 60)}
            {record.description && record.description.length > 60 ? '...' : ''}
          </Text>
        </div>
      ),
    },
    {
      title: 'Тип',
      dataIndex: 'propertyType',
      key: 'propertyType',
      width: 140,
      render: (type: PropertyType) => (
        <Tag color="blue">
          {PROPERTY_TYPE_LABELS[type] || type}
        </Tag>
      ),
    },
    {
      title: 'Адрес',
      dataIndex: 'address',
      key: 'address',
      width: 200,
      render: (address: string) => (
        <Space>
          <EnvironmentOutlined style={{ color: '#8c8c8c' }} />
          <Text type="secondary">{address || 'Не указан'}</Text>
        </Space>
      ),
    },
    {
      title: 'Цена',
      dataIndex: 'price',
      key: 'price',
      width: 140,
      render: (price: string) => (
        <Text strong style={{ color: '#137333' }}>
          {price ? `${Number(price).toLocaleString('ru-RU')} ₽` : '—'}
        </Text>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: PropertyStatus) => {
        const colors = PROPERTY_STATUS_COLORS[status];
        return (
          <Tag
            style={{
              color: colors.text,
              backgroundColor: colors.bg,
              borderColor: colors.border,
            }}
          >
            {PROPERTY_STATUS_LABELS[status] || status}
          </Tag>
        );
      },
    },
    {
      title: 'Дата создания',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (date: string) => (
        <Text type="secondary">
          {new Date(date).toLocaleDateString('ru-RU')}
        </Text>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Просмотреть">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedProperty(record);
                setPropertyDetailVisible(true);
              }}
            />
          </Tooltip>
          {record.status === 'PROPERTY_STATUS_NEW' && (
            <>
              <Tooltip title="Опубликовать">
                <Button
                  type="text"
                  icon={<CheckOutlined style={{ color: '#059669' }} />}
                  onClick={() => handleApproveProperty(record)}
                  loading={updatingProperty}
                />
              </Tooltip>
              <Tooltip title="Отклонить">
                <Button
                  type="text"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => handleRejectProperty(record)}
                  loading={updatingProperty}
                />
              </Tooltip>
            </>
          )}
          <Dropdown menu={{ items: getPropertyActionMenu(record) }} trigger={['click']}>
            <Button type="text" size="small">...</Button>
          </Dropdown>
        </Space>
      ),
    },
  ];


  return (
    <div className={styles.page}>
      {/* Заголовок страницы */}
      <div className={styles.pageHeader}>
        <div>
          <Title level={2} className={styles.pageTitle}>
            Администрирование
          </Title>
          <Text type="secondary">
            Управление пользователями, модерация лидов и объектов
          </Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            if (activeTab === 'users') loadUsers();
            else if (activeTab === 'leads') loadLeads();
            else if (activeTab === 'properties') loadProperties();
          }}
          loading={activeTab === 'users' ? loading : activeTab === 'leads' ? leadsLoading : propertiesLoading}
        >
          Обновить
        </Button>
      </div>

      {/* Вкладки */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'users',
            label: (
              <span>
                <UserOutlined />
                Пользователи
              </span>
            ),
          },
          {
            key: 'leads',
            label: (
              <span>
                <FileTextOutlined />
                Модерация лидов
                {leadsStats.pending > 0 && (
                  <Tag color="orange" style={{ marginLeft: 8 }}>
                    {leadsStats.pending}
                  </Tag>
                )}
              </span>
            ),
          },
          {
            key: 'properties',
            label: (
              <span>
                <HomeOutlined />
                Модерация объектов
                {propertiesStats.pending > 0 && (
                  <Tag color="orange" style={{ marginLeft: 8 }}>
                    {propertiesStats.pending}
                  </Tag>
                )}
              </span>
            ),
          },
        ]}
        style={{ marginBottom: 24 }}
      />

      {activeTab === 'users' && (
        <>
          {/* Статистика пользователей */}
          <Row gutter={[16, 16]} className={styles.statsRow}>
            <Col xs={12} sm={8} md={4}>
              <Card className={styles.statCard}>
                <Statistic
                  title="Всего"
                  value={stats.total}
                  prefix={<UserOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card className={`${styles.statCard} ${styles.statCardActive}`}>
                <Statistic
                  title="Активных"
                  value={stats.active}
                  valueStyle={{ color: '#059669' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card className={`${styles.statCard} ${styles.statCardSuspended}`}>
                <Statistic
                  title="Приостановлено"
                  value={stats.suspended}
                  valueStyle={{ color: '#D97706' }}
                  prefix={<PauseCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card className={`${styles.statCard} ${styles.statCardBanned}`}>
                <Statistic
                  title="Заблокировано"
                  value={stats.banned}
                  valueStyle={{ color: '#DC2626' }}
                  prefix={<StopOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card className={`${styles.statCard} ${styles.statCardAdmin}`}>
                <Statistic
                  title="Админов"
                  value={stats.admins}
                  valueStyle={{ color: '#7C3AED' }}
                  prefix={<CrownOutlined />}
                />
              </Card>
            </Col>
          </Row>

          {/* Фильтры пользователей */}
          <Card className={styles.filtersCard}>
            <div className={styles.filters}>
              <Input
                placeholder="Поиск по имени, email, телефону..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className={styles.searchInput}
                allowClear
              />
              <Select
                placeholder="Роль"
                value={roleFilter}
                onChange={setRoleFilter}
                allowClear
                className={styles.filterSelect}
                suffixIcon={<FilterOutlined />}
              >
                <Option value="USER_ROLE_USER">Пользователь</Option>
                <Option value="USER_ROLE_ADMIN">Администратор</Option>
              </Select>
              <Select
                placeholder="Статус"
                value={statusFilter}
                onChange={setStatusFilter}
                allowClear
                className={styles.filterSelect}
                suffixIcon={<FilterOutlined />}
              >
                <Option value="USER_STATUS_ACTIVE">Активен</Option>
                <Option value="USER_STATUS_SUSPENDED">Приостановлен</Option>
                <Option value="USER_STATUS_BANNED">Заблокирован</Option>
              </Select>
            </div>
          </Card>

          {/* Таблица пользователей */}
          <Card className={styles.tableCard}>
            <Table
              columns={columns}
              dataSource={filteredUsers}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} из ${total}`,
              }}
              scroll={{ x: 1000 }}
              locale={{
                emptyText: (
                  <div className={styles.emptyState}>
                    <UserOutlined className={styles.emptyIcon} />
                    <Text type="secondary">Пользователи не найдены</Text>
                  </div>
                ),
              }}
            />
          </Card>
        </>
      )}

      {/* Вкладка модерации лидов */}
      {activeTab === 'leads' && (
        <>
          {/* Статистика лидов */}
          <Row gutter={[16, 16]} className={styles.statsRow}>
            <Col xs={12} sm={8} md={6}>
              <Card className={styles.statCard}>
                <Statistic
                  title="Всего лидов"
                  value={leadsStats.total}
                  prefix={<FileTextOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Card className={`${styles.statCard} ${styles.statCardSuspended}`}>
                <Statistic
                  title="На модерации"
                  value={leadsStats.pending}
                  valueStyle={{ color: '#D97706' }}
                  prefix={<ClockCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Card className={`${styles.statCard} ${styles.statCardActive}`}>
                <Statistic
                  title="Опубликовано"
                  value={leadsStats.published}
                  valueStyle={{ color: '#059669' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Card className={styles.statCard}>
                <Statistic
                  title="Куплено"
                  value={leadsStats.purchased}
                  valueStyle={{ color: '#7C3AED' }}
                  prefix={<CheckOutlined />}
                />
              </Card>
            </Col>
          </Row>

          {/* Фильтры лидов */}
          <Card className={styles.filtersCard}>
            <div className={styles.filters}>
              <Input
                placeholder="Поиск по названию, описанию, контакту..."
                prefix={<SearchOutlined />}
                value={leadsSearchText}
                onChange={(e) => setLeadsSearchText(e.target.value)}
                className={styles.searchInput}
                allowClear
              />
              <Select
                placeholder="Статус"
                value={leadsStatusFilter}
                onChange={setLeadsStatusFilter}
                allowClear
                className={styles.filterSelect}
                suffixIcon={<FilterOutlined />}
              >
                <Option value="LEAD_STATUS_NEW">На модерации</Option>
                <Option value="LEAD_STATUS_PUBLISHED">Опубликован</Option>
                <Option value="LEAD_STATUS_PURCHASED">Куплен</Option>
                <Option value="LEAD_STATUS_DELETED">Удалён</Option>
              </Select>
            </div>
          </Card>

          {/* Таблица лидов */}
          <Card className={styles.tableCard}>
            <Table
              columns={leadsColumns}
              dataSource={filteredLeads}
              rowKey="leadId"
              loading={leadsLoading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} из ${total}`,
              }}
              scroll={{ x: 900 }}
              locale={{
                emptyText: (
                  <div className={styles.emptyState}>
                    <FileTextOutlined className={styles.emptyIcon} />
                    <Text type="secondary">Лиды не найдены</Text>
                  </div>
                ),
              }}
            />
          </Card>
        </>
      )}

      {/* Вкладка модерации объектов */}
      {activeTab === 'properties' && (
        <>
          {/* Статистика объектов */}
          <Row gutter={[16, 16]} className={styles.statsRow}>
            <Col xs={12} sm={8} md={6}>
              <Card className={styles.statCard}>
                <Statistic
                  title="Всего объектов"
                  value={propertiesStats.total}
                  prefix={<HomeOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Card className={`${styles.statCard} ${styles.statCardSuspended}`}>
                <Statistic
                  title="На модерации"
                  value={propertiesStats.pending}
                  valueStyle={{ color: '#D97706' }}
                  prefix={<ClockCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Card className={`${styles.statCard} ${styles.statCardActive}`}>
                <Statistic
                  title="Опубликовано"
                  value={propertiesStats.published}
                  valueStyle={{ color: '#059669' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Card className={styles.statCard}>
                <Statistic
                  title="Продано"
                  value={propertiesStats.sold}
                  valueStyle={{ color: '#7C3AED' }}
                  prefix={<DollarOutlined />}
                />
              </Card>
            </Col>
          </Row>

          {/* Фильтры объектов */}
          <Card className={styles.filtersCard}>
            <div className={styles.filters}>
              <Input
                placeholder="Поиск по названию, описанию, адресу..."
                prefix={<SearchOutlined />}
                value={propertiesSearchText}
                onChange={(e) => setPropertiesSearchText(e.target.value)}
                className={styles.searchInput}
                allowClear
              />
              <Select
                placeholder="Статус"
                value={propertiesStatusFilter}
                onChange={setPropertiesStatusFilter}
                allowClear
                className={styles.filterSelect}
                suffixIcon={<FilterOutlined />}
              >
                <Option value="PROPERTY_STATUS_NEW">На модерации</Option>
                <Option value="PROPERTY_STATUS_PUBLISHED">Опубликован</Option>
                <Option value="PROPERTY_STATUS_SOLD">Продан</Option>
                <Option value="PROPERTY_STATUS_DELETED">Удалён</Option>
              </Select>
            </div>
          </Card>

          {/* Таблица объектов */}
          <Card className={styles.tableCard}>
            <Table
              columns={propertiesColumns}
              dataSource={filteredProperties}
              rowKey="propertyId"
              loading={propertiesLoading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} из ${total}`,
              }}
              scroll={{ x: 1100 }}
              locale={{
                emptyText: (
                  <div className={styles.emptyState}>
                    <HomeOutlined className={styles.emptyIcon} />
                    <Text type="secondary">Объекты не найдены</Text>
                  </div>
                ),
              }}
            />
          </Card>
        </>
      )}

      {/* Модальное окно изменения статуса пользователя */}
      <Modal
        title={
          <Space>
            <UserOutlined />
            <span>Изменение статуса пользователя</span>
          </Space>
        }
        open={statusModalVisible}
        onCancel={() => {
          setStatusModalVisible(false);
          setSelectedUser(null);
          setNewStatus(undefined);
        }}
        onOk={handleStatusChange}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={updatingStatus}
        className={styles.statusModal}
      >
        {selectedUser && (
          <div className={styles.modalContent}>
            <div className={styles.selectedUserInfo}>
              <Avatar
                size={48}
                src={selectedUser.avatarUrl}
                icon={!selectedUser.avatarUrl && <UserOutlined />}
              />
              <div>
                <Text strong>
                  {selectedUser.firstName && selectedUser.lastName
                    ? `${selectedUser.firstName} ${selectedUser.lastName}`
                    : selectedUser.email}
                </Text>
                <br />
                <Text type="secondary">{selectedUser.email}</Text>
              </div>
            </div>

            <Form layout="vertical" className={styles.statusForm}>
              <Form.Item label="Новый статус">
                <Select
                  value={newStatus}
                  onChange={setNewStatus}
                  className={styles.statusSelect}
                >
                  <Option value="USER_STATUS_ACTIVE">
                    <Space>
                      <CheckCircleOutlined style={{ color: '#059669' }} />
                      Активен
                    </Space>
                  </Option>
                  <Option value="USER_STATUS_SUSPENDED">
                    <Space>
                      <PauseCircleOutlined style={{ color: '#D97706' }} />
                      Приостановлен
                    </Space>
                  </Option>
                  <Option value="USER_STATUS_BANNED">
                    <Space>
                      <StopOutlined style={{ color: '#DC2626' }} />
                      Заблокирован
                    </Space>
                  </Option>
                </Select>
              </Form.Item>
            </Form>

            {newStatus === 'USER_STATUS_BANNED' && (
              <div className={styles.warningMessage}>
                <Text type="danger">
                  Заблокированный пользователь потеряет доступ к системе
                </Text>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Модальное окно просмотра лида */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>Информация о лиде</span>
          </Space>
        }
        open={leadDetailVisible}
        onCancel={() => {
          setLeadDetailVisible(false);
          setSelectedLead(null);
        }}
        footer={
          selectedLead?.status === 'LEAD_STATUS_NEW' ? (
            <Space>
              <Button onClick={() => setLeadDetailVisible(false)}>
                Закрыть
              </Button>
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={() => {
                  setLeadDetailVisible(false);
                  handleRejectLead(selectedLead);
                }}
              >
                Отклонить
              </Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => {
                  setLeadDetailVisible(false);
                  handleApproveLead(selectedLead);
                }}
                loading={updatingLead}
              >
                Опубликовать
              </Button>
            </Space>
          ) : (
            <Button onClick={() => setLeadDetailVisible(false)}>
              Закрыть
            </Button>
          )
        }
        width={600}
      >
        {selectedLead && (
          <div className={styles.modalContent}>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Название">
                <Text strong>{selectedLead.title}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Описание">
                {selectedLead.description || 'Не указано'}
              </Descriptions.Item>
              <Descriptions.Item label="Статус">
                <Tag
                  style={{
                    color: LEAD_STATUS_COLORS[selectedLead.status].text,
                    backgroundColor: LEAD_STATUS_COLORS[selectedLead.status].bg,
                    borderColor: LEAD_STATUS_COLORS[selectedLead.status].border,
                  }}
                >
                  {LEAD_STATUS_LABELS[selectedLead.status]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Контактное лицо">
                <UserOutlined style={{ marginRight: 8 }} />
                {selectedLead.contactName}
              </Descriptions.Item>
              <Descriptions.Item label="Телефон">
                <PhoneOutlined style={{ marginRight: 8 }} />
                {selectedLead.contactPhone}
              </Descriptions.Item>
              {selectedLead.contactEmail && (
                <Descriptions.Item label="Email">
                  <MailOutlined style={{ marginRight: 8 }} />
                  {selectedLead.contactEmail}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Дата создания">
                {new Date(selectedLead.createdAt).toLocaleString('ru-RU')}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>

      {/* Модальное окно просмотра объекта */}
      <Modal
        title={
          <Space>
            <HomeOutlined />
            <span>Информация об объекте</span>
          </Space>
        }
        open={propertyDetailVisible}
        onCancel={() => {
          setPropertyDetailVisible(false);
          setSelectedProperty(null);
        }}
        footer={
          selectedProperty?.status === 'PROPERTY_STATUS_NEW' ? (
            <Space>
              <Button onClick={() => setPropertyDetailVisible(false)}>
                Закрыть
              </Button>
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={() => {
                  setPropertyDetailVisible(false);
                  handleRejectProperty(selectedProperty);
                }}
              >
                Отклонить
              </Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => {
                  setPropertyDetailVisible(false);
                  handleApproveProperty(selectedProperty);
                }}
                loading={updatingProperty}
              >
                Опубликовать
              </Button>
            </Space>
          ) : (
            <Button onClick={() => setPropertyDetailVisible(false)}>
              Закрыть
            </Button>
          )
        }
        width={600}
      >
        {selectedProperty && (
          <div className={styles.modalContent}>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Название">
                <Text strong>{selectedProperty.title}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Тип">
                <Tag color="blue">
                  {PROPERTY_TYPE_LABELS[selectedProperty.propertyType] || selectedProperty.propertyType}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Описание">
                {selectedProperty.description || 'Не указано'}
              </Descriptions.Item>
              <Descriptions.Item label="Адрес">
                <EnvironmentOutlined style={{ marginRight: 8 }} />
                {selectedProperty.address || 'Не указан'}
              </Descriptions.Item>
              <Descriptions.Item label="Цена">
                <Text strong style={{ color: '#137333' }}>
                  {selectedProperty.price ? `${Number(selectedProperty.price).toLocaleString('ru-RU')} ₽` : 'Не указана'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Площадь">
                {selectedProperty.area ? `${selectedProperty.area} м²` : 'Не указана'}
              </Descriptions.Item>
              <Descriptions.Item label="Комнат">
                {selectedProperty.rooms || 'Не указано'}
              </Descriptions.Item>
              <Descriptions.Item label="Статус">
                <Tag
                  style={{
                    color: PROPERTY_STATUS_COLORS[selectedProperty.status].text,
                    backgroundColor: PROPERTY_STATUS_COLORS[selectedProperty.status].bg,
                    borderColor: PROPERTY_STATUS_COLORS[selectedProperty.status].border,
                  }}
                >
                  {PROPERTY_STATUS_LABELS[selectedProperty.status]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Дата создания">
                {new Date(selectedProperty.createdAt).toLocaleString('ru-RU')}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminPage;

