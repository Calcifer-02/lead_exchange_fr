import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Card,
  Input,
  Button,
  Empty,
  Space,
  Select,
  Typography,
  Row,
  Col,
  Divider,
  Tag,
  Spin,
  Alert,
  Modal,
  Badge,
  Tooltip,
  Tabs,
  List,
  Descriptions,
  message,
  Pagination,
  Drawer,
} from 'antd';
import {
  SearchOutlined,
  FileTextOutlined,
  UserOutlined,
  FilterOutlined,
  ReloadOutlined,
  EyeOutlined,
  PhoneOutlined,
  MailOutlined,
  HeartOutlined,
  ShareAltOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { leadsAPI } from '../../api';
import type { Lead, LeadStatus } from '../../types';
import { LEAD_STATUS_LABELS } from '../../types';
import { maskPhone, maskEmail, maskName } from '../../utils/contactMask';
import styles from './styles.module.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface LeadFilters {
  search: string;
  status: LeadStatus | 'all';
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface ViewPreferences {
  viewMode: 'grid' | 'list';
}

interface ParsedRequirement {
  roomNumber?: number;
  price?: string;
  preferredPrice?: string;
  district?: string;
  region?: string;
  [key: string]: unknown;
}

interface ParsedLead extends Lead {
  parsedRequirement: ParsedRequirement;
}

const INITIAL_FILTERS: LeadFilters = {
  search: '',
  status: 'all',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

const INITIAL_VIEW_PREFS: ViewPreferences = {
  viewMode: 'grid',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Все статусы' },
  { value: 'LEAD_STATUS_NEW', label: 'Новый', color: 'blue' },
  { value: 'LEAD_STATUS_PUBLISHED', label: 'Опубликован', color: 'green' },
  { value: 'LEAD_STATUS_PURCHASED', label: 'Куплен', color: 'orange' },
  { value: 'LEAD_STATUS_DELETED', label: 'Удалён', color: 'red' },
];

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Дата создания' },
  { value: 'title', label: 'Название' },
  { value: 'status', label: 'Статус' },
];

const STATUS_MAP: Record<string, LeadStatus> = {
  'LEAD_STATUS_NEW': 'LEAD_STATUS_NEW',
  'LEAD_STATUS_PUBLISHED': 'LEAD_STATUS_PUBLISHED',
  'LEAD_STATUS_PURCHASED': 'LEAD_STATUS_PURCHASED',
  'LEAD_STATUS_DELETED': 'LEAD_STATUS_DELETED',
  'LEAD_STATUS_UNSPECIFIED': 'LEAD_STATUS_UNSPECIFIED',
};

// Парсинг requirement из JSON или base64
const parseRequirement = (requirement: string): ParsedRequirement => {
  if (!requirement) return {};

  try {
    // Пробуем как обычный JSON
    return JSON.parse(requirement);
  } catch {
    try {
      // Пробуем как base64
      const decoded = decodeURIComponent(escape(atob(requirement)));
      return JSON.parse(decoded);
    } catch {
      return {};
    }
  }
};

// Форматирование цены
const formatPrice = (price: string | number | undefined): string => {
  if (!price) return '—';
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numPrice)) return '—';
  return numPrice.toLocaleString('ru-RU') + ' ₽';
};

// Форматирование даты
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const LeadsCatalogPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Инициализация состояний из URL
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialPageSize = parseInt(searchParams.get('pageSize') || '12', 10);
  const initialSearch = searchParams.get('search') || '';
  const initialStatus = (searchParams.get('status') as LeadStatus | 'all') || 'all';
  const initialTab = searchParams.get('tab') || 'all';

  const [leads, setLeads] = useState<Lead[]>([]);
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<LeadFilters>({
    ...INITIAL_FILTERS,
    search: initialSearch,
    status: initialStatus,
  });
  const [viewPrefs, setViewPrefs] = useState<ViewPreferences>(INITIAL_VIEW_PREFS);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<ParsedLead | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState(initialTab);
  const [mobileFiltersVisible, setMobileFiltersVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 992);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const initialLoadRef = useRef(true);

  // Получение ID текущего пользователя
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    setCurrentUserId(userId);
  }, []);

  // Синхронизация URL с состоянием пагинации и фильтров
  useEffect(() => {
    const params = new URLSearchParams();

    if (currentPage !== 1) params.set('page', currentPage.toString());
    if (pageSize !== 12) params.set('pageSize', pageSize.toString());
    if (filters.search) params.set('search', filters.search);
    if (filters.status !== 'all') params.set('status', filters.status);
    if (activeTab !== 'all') params.set('tab', activeTab);

    const newSearch = params.toString();
    const currentSearch = searchParams.toString();

    // Обновляем URL только если параметры изменились
    if (newSearch !== currentSearch) {
      setSearchParams(params, { replace: true });
    }
  }, [currentPage, pageSize, filters.search, filters.status, activeTab, searchParams, setSearchParams]);

  // Отслеживание размера экрана
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 992);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // По умолчанию загружаем только опубликованные лиды
        const leadsResponse = await leadsAPI.listLeads({
          status: filters.status === 'all' ? 'LEAD_STATUS_PUBLISHED' : filters.status,
        });

        const mappedLeads = leadsResponse.leads.map(lead => ({
          ...lead,
          status: STATUS_MAP[lead.status] || 'LEAD_STATUS_UNSPECIFIED',
        }));

        // Дополнительная фильтрация: показываем только опубликованные лиды в каталоге
        const publishedLeads = mappedLeads.filter(lead =>
          lead.status === 'LEAD_STATUS_PUBLISHED' || lead.status === 'LEAD_STATUS_PURCHASED'
        );

        setLeads(publishedLeads);
        setParsedLeads(publishedLeads.map(lead => ({
          ...lead,
          parsedRequirement: parseRequirement(lead.requirement),
        })));

        // Загрузка избранного из localStorage
        const savedFavorites = localStorage.getItem('leads-favorites');
        if (savedFavorites) {
          setFavorites(new Set(JSON.parse(savedFavorites)));
        }
      } catch {
        setError('Не удалось загрузить данные. Пожалуйста, попробуйте позже.');
      } finally {
        setLoading(false);
        initialLoadRef.current = false;
      }
    };

    loadData();
  }, [filters.status]);

  // Фильтрация лидов
  const filteredLeads = useMemo(() => {
    if (!parsedLeads.length) return [];

    let result = [...parsedLeads];

    // Фильтр по вкладке
    if (activeTab === 'favorites') {
      result = result.filter(lead => favorites.has(lead.leadId));
    } else if (activeTab === 'published') {
      result = result.filter(lead => lead.status === 'LEAD_STATUS_PUBLISHED');
    }
    // Убираем вкладку "new" из каталога - она только для админов

    // Поиск
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(lead =>
        lead.title.toLowerCase().includes(searchLower) ||
        lead.description.toLowerCase().includes(searchLower) ||
        lead.contactName.toLowerCase().includes(searchLower) ||
        lead.contactEmail?.toLowerCase().includes(searchLower)
      );
    }

    // Сортировка
    result.sort((a, b) => {
      const aValue = a[filters.sortBy as keyof Lead] as string | number;
      const bValue = b[filters.sortBy as keyof Lead] as string | number;

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return result;
  }, [parsedLeads, filters, activeTab, favorites]);

  // Пагинированные лиды
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredLeads.slice(startIndex, startIndex + pageSize);
  }, [filteredLeads, currentPage, pageSize]);

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, activeTab]);

  const handleSearch = (search: string) => {
    setFilters(prev => ({ ...prev, search }));
  };

  const updateFilter = (key: keyof LeadFilters, value: LeadFilters[keyof LeadFilters]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(INITIAL_FILTERS);
    setActiveTab('all');
    setCurrentPage(1);
    setMobileFiltersVisible(false);
  };

  const hasActiveFilters = useMemo(() => {
    return filters.search !== '' || filters.status !== 'all';
  }, [filters]);

  // Обработчики пагинации
  const handlePageChange = useCallback((page: number, size?: number) => {
    setCurrentPage(page);
    if (size && size !== pageSize) {
      setPageSize(size);
    }
    // Скролл наверх при смене страницы
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pageSize]);

  // Избранное
  const toggleFavorite = (leadId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(leadId)) {
      newFavorites.delete(leadId);
    } else {
      newFavorites.add(leadId);
    }
    setFavorites(newFavorites);
    localStorage.setItem('leads-favorites', JSON.stringify([...newFavorites]));
  };

  const isFavorite = (leadId: string) => favorites.has(leadId);


  const getStatusTagColor = (status: LeadStatus) => {
    const option = STATUS_OPTIONS.find(opt => opt.value === status);
    return option?.color || 'default';
  };

  // Проверка доступности контактов для лида
  const areContactsAccessible = (lead: ParsedLead): boolean => {
    // Владелец лида видит свои контакты
    if (currentUserId && lead.ownerUserId === currentUserId) {
      return true;
    }
    // Для купленных лидов - контакты доступны покупателю
    // Здесь нужна проверка через API, но пока показываем только владельцу
    return false;
  };

  // Получение отображаемых контактов (замаскированных или реальных)
  const getDisplayContact = (lead: ParsedLead, field: 'name' | 'phone' | 'email'): string => {
    const isAccessible = areContactsAccessible(lead);

    switch (field) {
      case 'name':
        return isAccessible ? lead.contactName : maskName(lead.contactName);
      case 'phone':
        return isAccessible ? lead.contactPhone : maskPhone(lead.contactPhone);
      case 'email':
        return isAccessible ? (lead.contactEmail || '') : maskEmail(lead.contactEmail || '');
      default:
        return '';
    }
  };

  // Обработчики
  const handleLeadClick = (lead: ParsedLead) => {
    setSelectedLead(lead);
    setDetailModalVisible(true);
  };

  const handleContact = (lead: ParsedLead, method: 'phone' | 'email') => {
    const contact = method === 'phone' ? lead.contactPhone : lead.contactEmail;

    if (method === 'phone' && contact) {
      window.open(`tel:${contact}`);
    } else if (contact) {
      window.open(`mailto:${contact}`);
    }
  };

  const handleShare = async (lead: ParsedLead) => {
    const leadUrl = `${window.location.origin}/leads-catalog/${lead.leadId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: lead.title,
          text: lead.description,
          url: leadUrl,
        });
      } catch {
        // Пользователь отменил
      }
    } else {
      try {
        await navigator.clipboard.writeText(leadUrl);
        message.success('Ссылка скопирована в буфер обмена');
      } catch {
        message.error('Не удалось скопировать ссылку');
      }
    }
  };

  // Рендер карточки лида
  const renderLeadCard = (lead: ParsedLead) => {
    const isFav = isFavorite(lead.leadId);
    const price = lead.parsedRequirement.preferredPrice || lead.parsedRequirement.price;

    return (
      <div key={lead.leadId} className={styles.leadCardWrapper}>
        <Badge.Ribbon
          text={LEAD_STATUS_LABELS[lead.status]}
          color={getStatusTagColor(lead.status)}
        >
          <Card
            className={styles.leadCard}
            hoverable
            onClick={() => handleLeadClick(lead)}
          >
          <div className={styles.cardHeader}>
            <FileTextOutlined className={styles.leadIcon} />
            <div className={styles.cardActions}>
              <Tooltip title={isFav ? 'Убрать из избранного' : 'В избранное'}>
                <Button
                  type="text"
                  icon={<HeartOutlined style={{ color: isFav ? '#ff4d4f' : undefined }} />}
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(lead.leadId); }}
                  size="small"
                />
              </Tooltip>
              <Tooltip title="Поделиться">
                <Button
                  type="text"
                  icon={<ShareAltOutlined />}
                  onClick={(e) => { e.stopPropagation(); handleShare(lead); }}
                  size="small"
                />
              </Tooltip>
            </div>
          </div>

          <Title level={5} className={styles.leadTitle} ellipsis={{ rows: 2 }}>
            {lead.title}
          </Title>

          <Paragraph ellipsis={{ rows: 3 }} className={styles.leadDescription}>
            {lead.description || 'Описание отсутствует'}
          </Paragraph>

          <div className={styles.priceContainer}>
            {price && (
              <div className={styles.leadPrice}>
                {formatPrice(price)}
              </div>
            )}
          </div>

          <Divider style={{ margin: '12px 0', flexShrink: 0 }} />

          <div className={styles.contactInfo}>
            <div className={styles.contactItem}>
              <UserOutlined />
              <Text ellipsis>{getDisplayContact(lead, 'name')}</Text>
            </div>
            <div className={styles.contactItem}>
              <PhoneOutlined />
              <Text ellipsis>{getDisplayContact(lead, 'phone')}</Text>
            </div>
            <div className={styles.contactItem}>
              {lead.contactEmail ? (
                <>
                  <MailOutlined />
                  <Text ellipsis>{getDisplayContact(lead, 'email')}</Text>
                </>
              ) : (
                <Text type="secondary" style={{ fontSize: 13 }}>&nbsp;</Text>
              )}
            </div>
          </div>

          <div className={styles.cardFooter}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatDate(lead.createdAt)}
            </Text>
            <Space size={4}>
              <Tooltip title="Просмотреть">
                <Button
                  type="text"
                  icon={<EyeOutlined />}
                  size="small"
                  onClick={(e) => { e.stopPropagation(); navigate(`/leads-catalog/${lead.leadId}`); }}
                />
              </Tooltip>
              <Tooltip title={areContactsAccessible(lead) ? "Позвонить" : "Контакты скрыты до покупки"}>
                <Button
                  type="text"
                  icon={<PhoneOutlined />}
                  size="small"
                  disabled={!areContactsAccessible(lead)}
                  onClick={(e) => { e.stopPropagation(); handleContact(lead, 'phone'); }}
                />
              </Tooltip>
              <Tooltip title={areContactsAccessible(lead) ? "Написать" : "Контакты скрыты до покупки"}>
                <Button
                  type="text"
                  icon={<MailOutlined />}
                  size="small"
                  disabled={!areContactsAccessible(lead)}
                  onClick={(e) => { e.stopPropagation(); handleContact(lead, 'email'); }}
                />
              </Tooltip>
            </Space>
          </div>
        </Card>
      </Badge.Ribbon>
      </div>
    );
  };

  // Рендер в виде списка
  const renderLeadListItem = (lead: ParsedLead) => {
    const isFav = isFavorite(lead.leadId);
    const price = lead.parsedRequirement.preferredPrice || lead.parsedRequirement.price;

    return (
      <List.Item
        key={lead.leadId}
        className={styles.listItem}
        actions={[
          <Button type="primary" onClick={() => navigate(`/leads-catalog/${lead.leadId}`)}>
            Подробнее
          </Button>,
          <Button
            icon={<HeartOutlined style={{ color: isFav ? '#ff4d4f' : undefined }} />}
            onClick={() => toggleFavorite(lead.leadId)}
          >
            {isFav ? 'В избранном' : 'В избранное'}
          </Button>,
        ]}
      >
        <List.Item.Meta
          avatar={<FileTextOutlined style={{ fontSize: 32, color: '#1890ff' }} />}
          title={
            <Space>
              <Text strong style={{ cursor: 'pointer' }} onClick={() => handleLeadClick(lead)}>
                {lead.title}
              </Text>
              <Tag color={getStatusTagColor(lead.status)}>
                {LEAD_STATUS_LABELS[lead.status]}
              </Tag>
            </Space>
          }
          description={
            <Space direction="vertical" size={4}>
              <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 0 }}>
                {lead.description}
              </Paragraph>
              <Space split={<Divider type="vertical" />}>
                <Text><UserOutlined /> {lead.contactName}</Text>
                <Text><PhoneOutlined /> {lead.contactPhone}</Text>
                {lead.contactEmail && <Text><MailOutlined /> {lead.contactEmail}</Text>}
              </Space>
              {price && (
                <Text strong style={{ color: '#1890ff' }}>
                  {formatPrice(price)}
                </Text>
              )}
              <Text type="secondary" style={{ fontSize: 12 }}>
                Создан: {formatDate(lead.createdAt)}
              </Text>
            </Space>
          }
        />
      </List.Item>
    );
  };

  // Модальное окно деталей
  const renderDetailModal = () => {
    if (!selectedLead) return null;

    const price = selectedLead.parsedRequirement.preferredPrice || selectedLead.parsedRequirement.price;
    const requirement = selectedLead.parsedRequirement;

    return (
      <Modal
        title={selectedLead.title}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Закрыть
          </Button>,
          <Button
            key="favorite"
            icon={<HeartOutlined style={{ color: isFavorite(selectedLead.leadId) ? '#ff4d4f' : undefined }} />}
            onClick={() => toggleFavorite(selectedLead.leadId)}
          >
            {isFavorite(selectedLead.leadId) ? 'Убрать из избранного' : 'В избранное'}
          </Button>,
          <Button
            key="view"
            type="primary"
            onClick={() => navigate(`/leads-catalog/${selectedLead.leadId}`)}
          >
            Открыть страницу лида
          </Button>,
        ]}
        width={600}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={5}>Описание</Title>
            <Paragraph>{selectedLead.description || 'Описание отсутствует'}</Paragraph>
          </div>

          <Descriptions title="Информация о лиде" bordered column={1} size="small">
            <Descriptions.Item label="Статус">
              <Tag color={getStatusTagColor(selectedLead.status)}>
                {LEAD_STATUS_LABELS[selectedLead.status]}
              </Tag>
            </Descriptions.Item>
            {price && (
              <Descriptions.Item label="Желаемая цена">
                {formatPrice(price)}
              </Descriptions.Item>
            )}
            {requirement.roomNumber && (
              <Descriptions.Item label="Комнаты">
                {requirement.roomNumber}
              </Descriptions.Item>
            )}
            {requirement.district && (
              <Descriptions.Item label="Район">
                {requirement.district}
              </Descriptions.Item>
            )}
            {requirement.region && (
              <Descriptions.Item label="Регион">
                {requirement.region}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Создан">
              {formatDate(selectedLead.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Обновлён">
              {formatDate(selectedLead.updatedAt)}
            </Descriptions.Item>
          </Descriptions>

          <Descriptions title="Контактная информация" bordered column={1} size="small">
            <Descriptions.Item label="Имя">
              <UserOutlined /> {getDisplayContact(selectedLead, 'name')}
            </Descriptions.Item>
            <Descriptions.Item label="Телефон">
              {areContactsAccessible(selectedLead) ? (
                <a href={`tel:${selectedLead.contactPhone}`}>
                  <PhoneOutlined /> {selectedLead.contactPhone}
                </a>
              ) : (
                <span><PhoneOutlined /> {getDisplayContact(selectedLead, 'phone')}</span>
              )}
            </Descriptions.Item>
            {selectedLead.contactEmail && (
              <Descriptions.Item label="Email">
                {areContactsAccessible(selectedLead) ? (
                  <a href={`mailto:${selectedLead.contactEmail}`}>
                    <MailOutlined /> {selectedLead.contactEmail}
                  </a>
                ) : (
                  <span><MailOutlined /> {getDisplayContact(selectedLead, 'email')}</span>
                )}
              </Descriptions.Item>
            )}
            {!areContactsAccessible(selectedLead) && (
              <Descriptions.Item label="">
                <Text type="warning" style={{ fontSize: 12 }}>
                  Контакты будут доступны после покупки лида
                </Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Space>
      </Modal>
    );
  };

  return (
    <div className={styles.page}>
      {/* Заголовок */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <Title level={1} className={styles.pageTitle}>Каталог лидов</Title>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/leads/new')}
            >
              Добавить лид
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => window.location.reload()}
              loading={loading}
            >
              Обновить
            </Button>
          </Space>
        </div>
      </div>

      {/* Вкладки и управление видом */}
      <Card className={styles.controlCard}>
        <div className={styles.controlRow}>
          <div className={styles.tabsWrapper}>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                { key: 'all', label: `Все лиды (${leads.length})` },
                { key: 'favorites', label: `Избранное (${favorites.size})` },
              ]}
            />
          </div>

          <Space wrap>
            {isMobile && (
              <Button
                icon={<FilterOutlined />}
                onClick={() => setMobileFiltersVisible(true)}
              >
                Фильтры {hasActiveFilters && <Badge count="✓" size="small" style={{ backgroundColor: '#52c41a', marginLeft: 4 }} />}
              </Button>
            )}
            <Select
              value={viewPrefs.viewMode}
              onChange={(value) => setViewPrefs(prev => ({ ...prev, viewMode: value }))}
              style={{ width: 100 }}
            >
              <Option value="grid">Сетка</Option>
              <Option value="list">Список</Option>
            </Select>

            <Select
              value={filters.sortBy}
              onChange={(value) => updateFilter('sortBy', value)}
              style={{ width: 130 }}
            >
              {SORT_OPTIONS.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>

            <Button
              icon={<FilterOutlined />}
              onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {filters.sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </Space>
        </div>
      </Card>

      {error && (
        <Alert
          message="Ошибка"
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={24}>
        {/* Боковая панель фильтров - только для десктопа */}
        {!isMobile && (
          <Col xs={0} lg={6}>
            <Card
              className={styles.filtersCard}
              title={
                <Space>
                  <FilterOutlined />
                  Фильтры
                  {hasActiveFilters && (
                    <Badge count="✓" style={{ backgroundColor: '#52c41a' }} />
                  )}
                </Space>
              }
              extra={
                <Button type="link" onClick={clearFilters} size="small">
                  Сбросить
                </Button>
              }
            >
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {/* Поиск */}
                <div>
                  <Text strong>Поиск</Text>
                  <Input
                    placeholder="Название, описание, контакт..."
                    prefix={<SearchOutlined />}
                    value={filters.search}
                    onChange={(e) => handleSearch(e.target.value)}
                    style={{ marginTop: 8 }}
                    allowClear
                  />
                </div>

                <Divider />

              {/* Статус */}
              <div>
                <Text strong>Статус</Text>
                <Select
                  value={filters.status}
                  onChange={(value) => updateFilter('status', value)}
                  style={{ width: '100%', marginTop: 8 }}
                >
                  {STATUS_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </div>

              <Divider />

              <Button onClick={clearFilters} block type="default">
                Сбросить все фильтры
              </Button>
            </Space>
          </Card>
        </Col>
        )}

        {/* Основная область с лидами */}
        <Col xs={24} lg={isMobile ? 24 : 18}>
          <div className={styles.leadsContainer}>
            {loading && initialLoadRef.current ? (
              <div className={styles.loadingContainer}>
                <Spin size="large" />
                <Text style={{ marginTop: 16, display: 'block' }}>Загрузка лидов...</Text>
              </div>
            ) : filteredLeads.length > 0 ? (
              <>
                <div className={styles.resultsInfo}>
                  <Text type="secondary">
                    Показано {paginatedLeads.length} из {filteredLeads.length} лидов
                    {hasActiveFilters && ' по вашим фильтрам'}
                  </Text>
                </div>

                {viewPrefs.viewMode === 'grid' ? (
                  <div className={styles.gridContainer}>
                    {paginatedLeads.map(renderLeadCard)}
                  </div>
                ) : (
                  <List
                    dataSource={paginatedLeads}
                    renderItem={renderLeadListItem}
                    className={styles.listView}
                  />
                )}

                {/* Пагинация */}
                {filteredLeads.length > 0 && (
                  <div className={styles.paginationContainer}>
                    <Pagination
                      current={currentPage}
                      pageSize={pageSize}
                      total={filteredLeads.length}
                      onChange={handlePageChange}
                      onShowSizeChange={handlePageChange}
                      showSizeChanger={!isMobile}
                      showQuickJumper={!isMobile}
                      pageSizeOptions={['12', '24', '48', '96']}
                      showTotal={!isMobile ? (total, range) => `${range[0]}-${range[1]} из ${total}` : undefined}
                      size={isMobile ? 'small' : 'default'}
                      locale={{ items_per_page: '/ стр.' }}
                    />
                  </div>
                )}
              </>
            ) : (
              <Empty
                description={
                  hasActiveFilters
                    ? 'Нет лидов, соответствующих фильтрам'
                    : 'Лиды пока не добавлены'
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                {hasActiveFilters ? (
                  <Button type="primary" onClick={clearFilters}>
                    Сбросить фильтры
                  </Button>
                ) : (
                  <Button type="primary" onClick={() => navigate('/leads/new')}>
                    Добавить первый лид
                  </Button>
                )}
              </Empty>
            )}
          </div>
        </Col>
      </Row>

      {/* Мобильный Drawer с фильтрами */}
      <Drawer
        title={
          <Space>
            <FilterOutlined />
            Фильтры
            {hasActiveFilters && (
              <Badge count="✓" style={{ backgroundColor: '#52c41a' }} />
            )}
          </Space>
        }
        placement="right"
        onClose={() => setMobileFiltersVisible(false)}
        open={mobileFiltersVisible}
        width={300}
        extra={
          <Button type="link" onClick={clearFilters} size="small">
            Сбросить
          </Button>
        }
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {/* Поиск */}
          <div>
            <Text strong>Поиск</Text>
            <Input
              placeholder="Название, описание, контакт..."
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => handleSearch(e.target.value)}
              style={{ marginTop: 8 }}
              allowClear
            />
          </div>

          <Divider />

          {/* Статус */}
          <div>
            <Text strong>Статус</Text>
            <Select
              value={filters.status}
              onChange={(value) => updateFilter('status', value)}
              style={{ width: '100%', marginTop: 8 }}
            >
              {STATUS_OPTIONS.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </div>

          <Divider />

          <Button onClick={clearFilters} block type="default">
            Сбросить все фильтры
          </Button>

          <Button
            type="primary"
            block
            onClick={() => setMobileFiltersVisible(false)}
          >
            Применить
          </Button>
        </Space>
      </Drawer>

      {renderDetailModal()}
    </div>
  );
};

export default LeadsCatalogPage;

