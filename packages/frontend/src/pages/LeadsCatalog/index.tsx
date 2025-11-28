import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Input,
  Button,
  Empty,
  Space,
  Select,
  InputNumber,
  Typography,
  Row,
  Col,
  Divider,
  Tag,
  Avatar,
  Spin,
  Alert,
  Modal,
  Badge,
  Tooltip,
  Rate,
  Tabs,
  List,
  Descriptions
} from 'antd';
import {
  SearchOutlined,
  HomeOutlined,
  EnvironmentOutlined,
  UserOutlined,
  FilterOutlined,
  ReloadOutlined,
  EyeOutlined,
  PhoneOutlined,
  MailOutlined,
  HeartOutlined,
  ShareAltOutlined,
  ExportOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { leadsAPI } from '../../api';
import type { Lead, LeadStatus } from '../../types';
import styles from './styles.module.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

interface LeadFilters {
  search: string;
  status: LeadStatus | 'all';
  minPrice: number | null | undefined;
  maxPrice: number | null | undefined;
  city: string;
  propertyType: string;
  dealType: string;
  minRooms: number | null | undefined;
  maxRooms: number | null | undefined;
  minArea: number | null | undefined;
  maxArea: number | null | undefined;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface ViewPreferences {
  viewMode: 'grid' | 'list';
  itemsPerPage: number;
  showPrices: boolean;
  showContacts: boolean;
}

interface RequirementData {
  city: string;
  address: string;
  price: number;
  area: number;
  rooms: number;
  floor: number;
  floorsTotal: number;
  propertyType: string;
  dealType: string;
  buildingType: string;
  photos: string[];
  rating?: number;
  tags?: string[];
  phone?: string;
  email?: string;
}

interface ParsedLead extends Lead {
  requirementData: RequirementData;
}

const INITIAL_FILTERS: LeadFilters = {
  search: '',
  status: 'all',
  minPrice: undefined,
  maxPrice: undefined,
  city: '',
  propertyType: '',
  dealType: '',
  minRooms: undefined,
  maxRooms: undefined,
  minArea: undefined,
  maxArea: undefined,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

const INITIAL_VIEW_PREFS: ViewPreferences = {
  viewMode: 'grid',
  itemsPerPage: 12,
  showPrices: true,
  showContacts: false,
};

const STATUS_OPTIONS = [
  { value: 'LEAD_STATUS_NEW', label: 'Новый', color: 'blue' },
  { value: 'LEAD_STATUS_PUBLISHED', label: 'Опубликован', color: 'green' },
  { value: 'LEAD_STATUS_PURCHASED', label: 'Куплен', color: 'orange' },
  { value: 'LEAD_STATUS_DELETED', label: 'Удалён', color: 'red' },
  { value: 'LEAD_STATUS_UNSPECIFIED', label: 'Не указан', color: 'gray' },
];

const PROPERTY_TYPES = [
  { value: '', label: 'Все типы' },
  { value: 'flat', label: 'Квартира', icon: '🏢' },
  { value: 'house', label: 'Дом', icon: '🏠' },
  { value: 'apartment', label: 'Апартаменты', icon: '🏙️' },
  { value: 'commercial', label: 'Коммерческая', icon: '🏬' },
];

const DEAL_TYPES = [
  { value: '', label: 'Все типы' },
  { value: 'sale', label: 'Продажа', color: 'red' },
  { value: 'rent', label: 'Аренда', color: 'green' },
];

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Дата создания' },
  { value: 'price', label: 'Цена' },
  { value: 'area', label: 'Площадь' },
  { value: 'rooms', label: 'Комнаты' },
  { value: 'title', label: 'Название' },
];

const STATUS_MAP: Record<string, LeadStatus> = {
  'LEAD_STATUS_NEW': 'LEAD_STATUS_NEW',
  'LEAD_STATUS_PUBLISHED': 'LEAD_STATUS_PUBLISHED',
  'LEAD_STATUS_PURCHASED': 'LEAD_STATUS_PURCHASED',
  'LEAD_STATUS_DELETED': 'LEAD_STATUS_DELETED',
  'LEAD_STATUS_UNSPECIFIED': 'LEAD_STATUS_UNSPECIFIED',
};

const LeadsCatalogPage = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<LeadFilters>(INITIAL_FILTERS);
  const [viewPrefs, setViewPrefs] = useState<ViewPreferences>(INITIAL_VIEW_PREFS);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<ParsedLead | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('all');
  const initialLoadRef = useRef(true);
  const navigate = useNavigate();

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const leadsResponse = await leadsAPI.listLeads({
          status: filters.status === 'all' ? undefined : filters.status,
        });

        setLeads(leadsResponse.leads.map(lead => ({ ...lead, status: STATUS_MAP[lead.status] || 'LEAD_STATUS_UNSPECIFIED' })));
        setParsedLeads(leadsResponse.leads.map(lead => ({ ...lead, requirementData: getRequirementData(lead), status: STATUS_MAP[lead.status] || 'LEAD_STATUS_UNSPECIFIED' })));
        // setStats(statsResponse); // TODO: Implement when API is ready

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

  // Оптимизированная фильтрация с debounce
  const filteredLeads = useMemo(() => {
    if (!parsedLeads.length) return [];

    const result = parsedLeads.filter((lead) => {
      const requirementData = lead.requirementData;

      // Поиск
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          lead.title.toLowerCase().includes(searchLower) ||
          lead.description.toLowerCase().includes(searchLower) ||
          requirementData.city?.toLowerCase().includes(searchLower) ||
          requirementData.address?.toLowerCase().includes(searchLower) ||
          requirementData.tags?.some((tag: string) =>
            tag.toLowerCase().includes(searchLower)
          );

        if (!matchesSearch) return false;
      }

      // Числовые фильтры
      if (filters.minPrice && requirementData.price < filters.minPrice) return false;
      if (filters.maxPrice && requirementData.price > filters.maxPrice) return false;
      if (filters.minRooms && requirementData.rooms < filters.minRooms) return false;
      if (filters.maxRooms && requirementData.rooms > filters.maxRooms) return false;
      if (filters.minArea && requirementData.area < filters.minArea) return false;
      if (filters.maxArea && requirementData.area > filters.maxArea) return false;

      // Строковые фильтры
      if (filters.city && requirementData.city !== filters.city) return false;
      if (filters.propertyType && requirementData.propertyType !== filters.propertyType) return false;
      return !filters.dealType || requirementData.dealType === filters.dealType;
    });

    // Сортировка
    result.sort((a, b) => {
      let aValue: string | number, bValue: string | number;

      if (filters.sortBy === 'price' || filters.sortBy === 'area' || filters.sortBy === 'rooms') {
        const aReq = a.requirementData;
        const bReq = b.requirementData;
        aValue = aReq[filters.sortBy];
        bValue = bReq[filters.sortBy];
      } else {
        aValue = a[filters.sortBy as keyof Lead] as string | number;
        bValue = b[filters.sortBy as keyof Lead] as string | number;
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return result;
  }, [parsedLeads, filters]);


  const handleSearch = (search: string) => {
    updateFilter('search', search);
  };

  const updateFilter = (key: keyof LeadFilters, value: LeadFilters[keyof LeadFilters]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const updateViewPref = (key: keyof ViewPreferences, value: ViewPreferences[keyof ViewPreferences]) => {
    setViewPrefs(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) =>
      key === 'status' ? value !== 'all' : value !== '' && value != null
    );
  }, [filters]);

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

  // Вспомогательные функции
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    return STATUS_OPTIONS.find(opt => opt.value === status)?.color || 'default';
  };

  const getRequirementData = (lead: Lead) => {
    try {
      const decoded = decodeURIComponent(escape(atob(lead.requirement)));
      const data = JSON.parse(decoded);

      // Маппинг полей для совместимости с разными форматами requirement
      return {
        city: data.city || data.district || '',
        address: data.address || '',
        price: data.price || data.preferredPrice || 0,
        area: data.area || 0,
        rooms: data.rooms || data.roomNumber || 0,
        floor: data.floor || 0,
        floorsTotal: data.floorsTotal || 0,
        propertyType: data.propertyType || 'flat',
        dealType: data.dealType || 'sale',
        buildingType: data.buildingType || 'secondary',
        photos: data.photos || [],
        rating: data.rating,
        tags: data.tags,
        phone: data.phone,
        email: data.email,
      };
    } catch  {
      return {
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
        rating: undefined,
        tags: [],
        phone: '',
        email: '',
      };
    }
  };

  const getPropertyTypeLabel = (value: string) => {
    return PROPERTY_TYPES.find(pt => pt.value === value)?.label || value;
  };

  const getDealTypeLabel = (value: string) => {
    return DEAL_TYPES.find(dt => dt.value === value)?.label || value;
  };

  const getBuildingTypeLabel = (value: string) => {
    return value === 'new' ? 'Новостройка' : value === 'secondary' ? 'Вторичка' : value;
  };

  // Обработчики
  const handleLeadClick = (lead: ParsedLead) => {
    setSelectedLead(lead);
    setDetailModalVisible(true);
  };

  const handleContact = (lead: ParsedLead, method: 'phone' | 'email') => {
    const requirementData = lead.requirementData;
    const contact = method === 'phone' ? requirementData.phone : requirementData.email;

    if (method === 'phone' && contact) {
      window.open(`tel:${contact}`);
    } else if (contact) {
      window.open(`mailto:${contact}`);
    }
  };

  const handleShare = async (lead: ParsedLead) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: lead.title,
          text: lead.description,
          url: window.location.href,
        });
      } catch {
        // Ошибка при шаринге
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  // Рендер карточки лида
  const renderLeadCard = (lead: ParsedLead) => {
    const requirementData = lead.requirementData;
    const isFav = isFavorite(lead.leadId);

    return (
      <Badge.Ribbon
        key={lead.leadId}
        text={STATUS_OPTIONS.find(s => s.value === lead.status)?.label}
        color={getStatusColor(lead.status)}
      >
        <div className={styles.leadCard}>
          <div className={styles.imageContainer}>
            {requirementData.photos?.[0] ? (
              <img
                alt={lead.title}
                src={`data:image/jpeg;base64,${requirementData.photos[0]}`}
                className={styles.leadImage}
                onClick={() => handleLeadClick(lead)}
              />
            ) : (
              <div className={styles.noImage} onClick={() => handleLeadClick(lead)}>
                <HomeOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
              </div>
            )}
            <div className={styles.imageOverlay}>
              <Button
                type="text"
                icon={<HeartOutlined style={{ color: isFav ? '#ff4d4f' : '#fff' }} />}
                className={styles.favoriteBtn}
                onClick={() => toggleFavorite(lead.leadId)}
              />
              <Button
                type="text"
                icon={<ShareAltOutlined style={{ color: '#fff' }} />}
                className={styles.shareBtn}
                onClick={() => handleShare(lead)}
              />
            </div>
            {requirementData.tags?.slice(0, 2).map((tag: string) => (
              <Tag key={tag} className={styles.imageTag}>{tag}</Tag>
            ))}
          </div>
          <div className={styles.leadContent}>
            <Title level={4} className={styles.leadTitle} onClick={() => handleLeadClick(lead)}>
              {lead.title}
            </Title>

            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Text type="secondary" className={styles.location}>
                <EnvironmentOutlined /> {requirementData.city}, {requirementData.address}
              </Text>

              <div className={styles.leadStats}>
                <span><HomeOutlined /> {requirementData.rooms} комн.</span>
                <span>{requirementData.area} м²</span>
                <span>{requirementData.floor}/{requirementData.floorsTotal} эт.</span>
              </div>

              {viewPrefs.showPrices && (
                <div className={styles.leadPrice}>
                  {formatPrice(requirementData.price)}
                  {requirementData.dealType === 'rent' && <Text type="secondary"> / месяц</Text>}
                </div>
              )}

              <Paragraph ellipsis={{ rows: 2 }} className={styles.leadDescription}>
                {lead.description}
              </Paragraph>

              <div className={styles.leadMeta}>
                <div className={styles.metaLeft}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {formatDate(lead.createdAt)}
                  </Text>
                  {requirementData.rating && (
                    <Rate
                      disabled
                      defaultValue={requirementData.rating}
                      style={{ fontSize: 12, marginLeft: 8 }}
                    />
                  )}
                </div>
                <Avatar size="small" icon={<UserOutlined />} />
              </div>
            </Space>
          </div>
          <div className={styles.cardActions}>
            <Tooltip title="Просмотреть детали">
              <EyeOutlined onClick={() => handleLeadClick(lead)} />
            </Tooltip>
            <Tooltip title="Позвонить">
              <PhoneOutlined onClick={() => handleContact(lead, 'phone')} />
            </Tooltip>
            <Tooltip title="Написать email">
              <MailOutlined onClick={() => handleContact(lead, 'email')} />
            </Tooltip>
          </div>
        </div>
      </Badge.Ribbon>
    );
  };

  // Рендер в виде списка
  const renderLeadListItem = (lead: ParsedLead) => {
    const requirementData = lead.requirementData;
    const isFav = isFavorite(lead.leadId);

    return (
      <List.Item
        key={lead.leadId}
        className={styles.listItem}
        actions={[
          <Button type="primary" onClick={() => handleLeadClick(lead)}>
            Детали
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
          avatar={
            <div className={styles.listImage}>
              {requirementData.photos?.[0] ? (
                <img src={`data:image/jpeg;base64,${requirementData.photos[0]}`} alt={lead.title} />
              ) : (
                <HomeOutlined style={{ fontSize: 32, color: '#d9d9d9' }} />
              )}
            </div>
          }
          title={
            <Space>
              <Text strong>{lead.title}</Text>
              <Tag color={getStatusColor(lead.status)}>
                {STATUS_OPTIONS.find(s => s.value === lead.status)?.label}
              </Tag>
            </Space>
          }
          description={
            <Space direction="vertical" size={4}>
              <Text><EnvironmentOutlined /> {requirementData.city}, {requirementData.address}</Text>
              <div className={styles.leadStats}>
                <span>{requirementData.rooms} комн.</span>
                <span>{requirementData.area} м²</span>
                <span>{requirementData.floor}/{requirementData.floorsTotal} эт.</span>
              </div>
              <Text>{lead.description}</Text>
              {viewPrefs.showPrices && (
                <div className={styles.leadPrice}>
                  {formatPrice(requirementData.price)}
                </div>
              )}
            </Space>
          }
        />
      </List.Item>
    );
  };

  // Модальное окно деталей
  const renderDetailModal = () => {
    if (!selectedLead) return null;

    return (
      <Modal
        title={selectedLead.title}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="view" type="primary" onClick={() => navigate(`/leads-catalog/${selectedLead.leadId}`)}>
            Просмотреть
          </Button>,
          <Button key="favorite"
                  icon={<HeartOutlined style={{ color: isFavorite(selectedLead.leadId) ? '#ff4d4f' : undefined }} />}
                  onClick={() => toggleFavorite(selectedLead.leadId)}
          >
            {isFavorite(selectedLead.leadId) ? 'Удалить из избранного' : 'В избранное'}
          </Button>,
        ]}
        width={800}
      >
        <div className={styles.detailContent}>
          <Row gutter={24}>
            <Col span={12}>
              {selectedLead.requirementData.photos?.[0] ? (
                <img
                  src={`data:image/jpeg;base64,${selectedLead.requirementData.photos[0]}`}
                  alt={selectedLead.title}
                  style={{ width: '100%', height: 'auto', borderRadius: 8, maxHeight: 400, objectFit: 'cover' }}
                />
              ) : (
                <div style={{ height: 300, background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
                  <HomeOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
                </div>
              )}
            </Col>
            <Col span={12}>
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                  <Title level={4}>Описание</Title>
                  <Paragraph>{selectedLead.description}</Paragraph>
                </div>

                <Descriptions title="Характеристики" bordered column={1} size="small">
                  <Descriptions.Item label="Статус">
                    <Tag color={getStatusColor(selectedLead.status)}>
                      {STATUS_OPTIONS.find(s => s.value === selectedLead.status)?.label}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Цена">
                    {formatPrice(selectedLead.requirementData.price)}
                    {selectedLead.requirementData.dealType === 'rent' && ' / месяц'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Город">{selectedLead.requirementData.city}</Descriptions.Item>
                  <Descriptions.Item label="Адрес">{selectedLead.requirementData.address}</Descriptions.Item>
                  <Descriptions.Item label="Тип объекта">{getPropertyTypeLabel(selectedLead.requirementData.propertyType)}</Descriptions.Item>
                  <Descriptions.Item label="Тип сделки">{getDealTypeLabel(selectedLead.requirementData.dealType)}</Descriptions.Item>
                  <Descriptions.Item label="Комнаты">{selectedLead.requirementData.rooms}</Descriptions.Item>
                  <Descriptions.Item label="Площадь">{selectedLead.requirementData.area} м²</Descriptions.Item>
                  <Descriptions.Item label="Этаж">{selectedLead.requirementData.floor}/{selectedLead.requirementData.floorsTotal}</Descriptions.Item>
                  <Descriptions.Item label="Тип дома">{getBuildingTypeLabel(selectedLead.requirementData.buildingType)}</Descriptions.Item>
                  <Descriptions.Item label="Создан">{formatDate(selectedLead.createdAt)}</Descriptions.Item>
                  {selectedLead.requirementData.rating && (
                    <Descriptions.Item label="Рейтинг">
                      <Rate disabled defaultValue={selectedLead.requirementData.rating} />
                    </Descriptions.Item>
                  )}
                </Descriptions>

                <div>
                  <Title level={4}>Контактная информация</Title>
                  <Space direction="vertical">
                    <Text><UserOutlined /> {selectedLead.contactName}</Text>
                    <Text><PhoneOutlined /> {selectedLead.contactPhone}</Text>
                    <Text><MailOutlined /> {selectedLead.contactEmail}</Text>
                  </Space>
                </div>
              </Space>
            </Col>
          </Row>
        </div>
      </Modal>
    );
  };

  return (
    <div className={styles.page}>
      {/* Заголовок и статистика */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <Title level={1} className={styles.pageTitle}>Каталог лидов</Title>
          <Space>
            <Button icon={<ExportOutlined />}>Экспорт</Button>
            <Button icon={<SettingOutlined />}>Настройки</Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => window.location.reload()}
              loading={loading}
            >
              Обновить
            </Button>
          </Space>
        </div>

        {/* {stats && (
          <div className={styles.statsSection}>
            <Row gutter={16}>
              <Col xs={12} sm={6}>
                <Statistic title="Всего лидов" value={stats.total} />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic title="Опубликованные" value={stats.published} />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic title="Новые" value={stats.new} />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="Средняя цена"
                  value={stats.averagePrice}
                  formatter={value => formatPrice(Number(value))}
                />
              </Col>
            </Row>
          </div>
        )} */}
      </div>

      {/* Вкладки и управление видом */}
      <Card className={styles.controlCard}>
        <div className={styles.controlRow}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              { key: 'all', label: `Все лиды (${leads.length})` },
              { key: 'favorites', label: `Избранное (${favorites.size})` },
              { key: 'published', label: 'Опубликованные' },
              { key: 'new', label: 'Новые' },
            ]}
          />

          <Space>
            <Select
              value={viewPrefs.viewMode}
              onChange={(value) => updateViewPref('viewMode', value)}
              style={{ width: 120 }}
            >
              <Option value="grid">Сетка</Option>
              <Option value="list">Список</Option>
            </Select>

            <Select
              value={filters.sortBy}
              onChange={(value) => updateFilter('sortBy', value)}
              style={{ width: 140 }}
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
              {filters.sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}
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
        {/* Боковая панель фильтров */}
        <Col xs={24} lg={6}>
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
                  placeholder="Название, город, адрес, теги..."
                  prefix={<SearchOutlined />}
                  defaultValue={filters.search}
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

              {/* Остальные фильтры... (можно свернуть для компактности) */}
              <Tabs size="small" defaultActiveKey="basic">
                <TabPane tab="Основные" key="basic">
                  {/* Основные фильтры */}
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {/* Цена */}
                    <div>
                      <Text strong>Цена (₽)</Text>
                      <div style={{ marginTop: 8 }}>
                        <InputNumber
                          placeholder="От"
                          value={filters.minPrice}
                          onChange={(value) => updateFilter('minPrice', value)}
                          style={{ width: '48%', marginRight: '4%' }}
                          formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''}
                        />
                        <InputNumber
                          placeholder="До"
                          value={filters.maxPrice}
                          onChange={(value) => updateFilter('maxPrice', value)}
                          style={{ width: '48%' }}
                          formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''}
                        />
                      </div>
                    </div>

                    {/* Город */}
                    <div>
                      <Text strong>Город</Text>
                      <Input
                        placeholder="Введите город"
                        value={filters.city}
                        onChange={(e) => updateFilter('city', e.target.value)}
                        style={{ marginTop: 8 }}
                      />
                    </div>
                  </Space>
                </TabPane>

                <TabPane tab="Дополнительно" key="advanced">
                  {/* Дополнительные фильтры */}
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {/* Тип объекта и сделки */}
                    <div>
                      <Text strong>Тип объекта</Text>
                      <Select
                        value={filters.propertyType}
                        onChange={(value) => updateFilter('propertyType', value)}
                        style={{ width: '100%', marginTop: 8 }}
                      >
                        {PROPERTY_TYPES.map(type => (
                          <Option key={type.value} value={type.value}>
                            {type.icon} {type.label}
                          </Option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <Text strong>Тип сделки</Text>
                      <Select
                        value={filters.dealType}
                        onChange={(value) => updateFilter('dealType', value)}
                        style={{ width: '100%', marginTop: 8 }}
                      >
                        {DEAL_TYPES.map(type => (
                          <Option key={type.value} value={type.value}>
                            {type.label}
                          </Option>
                        ))}
                      </Select>
                    </div>

                    {/* Комнаты и площадь */}
                    <div>
                      <Text strong>Комнаты</Text>
                      <div style={{ marginTop: 8 }}>
                        <InputNumber
                          placeholder="От"
                          value={filters.minRooms}
                          onChange={(value) => updateFilter('minRooms', value)}
                          style={{ width: '48%', marginRight: '4%' }}
                          min={1}
                        />
                        <InputNumber
                          placeholder="До"
                          value={filters.maxRooms}
                          onChange={(value) => updateFilter('maxRooms', value)}
                          style={{ width: '48%' }}
                          min={1}
                        />
                      </div>
                    </div>

                    <div>
                      <Text strong>Площадь (м²)</Text>
                      <div style={{ marginTop: 8 }}>
                        <InputNumber
                          placeholder="От"
                          value={filters.minArea}
                          onChange={(value) => updateFilter('minArea', value)}
                          style={{ width: '48%', marginRight: '4%' }}
                          min={1}
                          step={0.1}
                        />
                        <InputNumber
                          placeholder="До"
                          value={filters.maxArea}
                          onChange={(value) => updateFilter('maxArea', value)}
                          style={{ width: '48%' }}
                          min={1}
                          step={0.1}
                        />
                      </div>
                    </div>
                  </Space>
                </TabPane>
              </Tabs>

              <Button onClick={clearFilters} block type="default">
                Сбросить все фильтры
              </Button>
            </Space>
          </Card>
        </Col>

        {/* Основная область с лидами */}
        <Col xs={24} lg={18}>
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
                    Найдено {filteredLeads.length} лидов
                    {hasActiveFilters && ' по вашим фильтрам'}
                  </Text>
                </div>

                {viewPrefs.viewMode === 'grid' ? (
                  <div className={styles.gridContainer}>
                    {filteredLeads.map(renderLeadCard)}
                  </div>
                ) : (
                  <List
                    dataSource={filteredLeads}
                    renderItem={renderLeadListItem}
                    className={styles.listView}
                  />
                )}
              </>
            ) : (
              <Empty
                description="Нет лидов, соответствующих фильтрам"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button type="primary" onClick={clearFilters}>
                  Сбросить фильтры
                </Button>
              </Empty>
            )}
          </div>
        </Col>
      </Row>

      {renderDetailModal()}
    </div>
  );
};

export default LeadsCatalogPage;

