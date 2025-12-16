import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Card,
  Input,
  Button,
  Empty,
  Space,
  Select,
  Typography,
  Tag,
  Spin,
  Modal,
  Tooltip,
  Tabs,
  Descriptions,
  message,
  Pagination,
  Segmented,
} from 'antd';
import {
  SearchOutlined,
  HomeOutlined,
  FilterOutlined,
  ReloadOutlined,
  EyeOutlined,
  EnvironmentOutlined,
  AppstoreOutlined,
  TableOutlined,
  ExpandOutlined,
  HeartOutlined,
  HeartFilled,
} from '@ant-design/icons';
import { propertiesAPI } from '../../api';
import type { Property, PropertyStatus, PropertyType } from '../../types';
import { PROPERTY_TYPE_LABELS, PROPERTY_STATUS_LABELS } from '../../types';
import styles from './styles.module.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface PropertyFilters {
  search: string;
  status: PropertyStatus | 'all';
  propertyType: PropertyType | 'all';
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// Цвета для статусов объектов
const PROPERTY_STATUS_COLORS: Record<PropertyStatus, { text: string; bg: string; border: string }> = {
  PROPERTY_STATUS_UNSPECIFIED: { text: '#8c8c8c', bg: '#fafafa', border: '#d9d9d9' },
  PROPERTY_STATUS_NEW: { text: '#D97706', bg: '#FEF3C7', border: '#FCD34D' },
  PROPERTY_STATUS_PUBLISHED: { text: '#059669', bg: '#D1FAE5', border: '#6EE7B7' },
  PROPERTY_STATUS_SOLD: { text: '#7C3AED', bg: '#EDE9FE', border: '#C4B5FD' },
  PROPERTY_STATUS_DELETED: { text: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' },
};

const INITIAL_FILTERS: PropertyFilters = {
  search: '',
  status: 'all',
  propertyType: 'all',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};


const TYPE_OPTIONS = [
  { value: 'all', label: 'Все типы' },
  { value: 'PROPERTY_TYPE_APARTMENT', label: 'Квартира' },
  { value: 'PROPERTY_TYPE_HOUSE', label: 'Дом' },
  { value: 'PROPERTY_TYPE_COMMERCIAL', label: 'Коммерция' },
  { value: 'PROPERTY_TYPE_LAND', label: 'Земельный участок' },
];

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Дата создания' },
  { value: 'price', label: 'Цена' },
  { value: 'area', label: 'Площадь' },
  { value: 'rooms', label: 'Комнаты' },
];


const PropertiesCatalogPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Инициализация состояний из URL
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialPageSize = parseInt(searchParams.get('pageSize') || '12', 10);
  const initialSearch = searchParams.get('search') || '';
  const initialStatus = (searchParams.get('status') as PropertyStatus | 'all') || 'all';
  const initialType = (searchParams.get('type') as PropertyType | 'all') || 'all';
  const initialTab = searchParams.get('tab') || 'all';

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<PropertyFilters>({
    ...INITIAL_FILTERS,
    search: initialSearch,
    status: initialStatus,
    propertyType: initialType,
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState(initialTab);

  // Синхронизация URL с состоянием пагинации и фильтров
  useEffect(() => {
    const params = new URLSearchParams();

    if (currentPage !== 1) params.set('page', currentPage.toString());
    if (pageSize !== 12) params.set('pageSize', pageSize.toString());
    if (filters.search) params.set('search', filters.search);
    if (filters.status !== 'all') params.set('status', filters.status);
    if (filters.propertyType !== 'all') params.set('type', filters.propertyType);
    if (activeTab !== 'all') params.set('tab', activeTab);

    const newSearch = params.toString();
    const currentSearch = searchParams.toString();

    if (newSearch !== currentSearch) {
      setSearchParams(params, { replace: true });
    }
  }, [currentPage, pageSize, filters.search, filters.status, filters.propertyType, activeTab, searchParams, setSearchParams]);

  // Загрузка объектов
  const loadProperties = useCallback(async () => {
    try {
      setLoading(true);
      const propertiesList = await propertiesAPI.getProperties({
        status: 'PROPERTY_STATUS_PUBLISHED', // Показываем только опубликованные
      });
      setProperties(propertiesList || []);
    } catch (error) {
      console.error('Failed to load properties:', error);
      message.error('Не удалось загрузить объекты');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  // Фильтрация объектов
  const filteredProperties = useMemo(() => {
    let result = [...properties];

    // Поиск
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower) ||
          p.address?.toLowerCase().includes(searchLower)
      );
    }

    // Фильтр по типу
    if (filters.propertyType !== 'all') {
      result = result.filter((p) => p.propertyType === filters.propertyType);
    }

    // Фильтр по статусу
    if (filters.status !== 'all') {
      result = result.filter((p) => p.status === filters.status);
    }

    // Фильтр по вкладке
    if (activeTab === 'favorites') {
      result = result.filter((p) => favorites.has(p.propertyId));
    }

    // Сортировка
    result.sort((a, b) => {
      let comparison: number;
      switch (filters.sortBy) {
        case 'price':
          comparison = Number(a.price || 0) - Number(b.price || 0);
          break;
        case 'area':
          comparison = (a.area || 0) - (b.area || 0);
          break;
        case 'rooms':
          comparison = (a.rooms || 0) - (b.rooms || 0);
          break;
        case 'createdAt':
        default:
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [properties, filters, activeTab, favorites]);

  // Пагинация
  const paginatedProperties = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredProperties.slice(startIndex, startIndex + pageSize);
  }, [filteredProperties, currentPage, pageSize]);

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, activeTab]);

  // Обработчик изменения страницы
  const handlePageChange = useCallback((page: number, size?: number) => {
    setCurrentPage(page);
    if (size && size !== pageSize) {
      setPageSize(size);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pageSize]);

  // Обработчики
  const handlePropertyClick = (property: Property) => {
    navigate(`/properties/${property.propertyId}`);
  };

  const handlePropertyPreview = (property: Property, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProperty(property);
    setModalVisible(true);
  };

  const handleToggleFavorite = (propertyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(propertyId)) {
        newFavorites.delete(propertyId);
      } else {
        newFavorites.add(propertyId);
      }
      return newFavorites;
    });
  };

  const handleFilterChange = (key: keyof PropertyFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setActiveTab('all');
    setCurrentPage(1);
  };

  const formatPrice = (price: string | undefined): string => {
    if (!price) return '—';
    return new Intl.NumberFormat('ru-RU').format(Number(price)) + ' ₽';
  };

  // Рендер карточки объекта
  const renderPropertyCard = (property: Property) => {
    const colors = PROPERTY_STATUS_COLORS[property.status];
    const isFavorite = favorites.has(property.propertyId);

    return (
      <Card
        key={property.propertyId}
        className={styles.propertyCard}
        hoverable
        onClick={() => handlePropertyClick(property)}
      >
        <div className={styles.cardHeader}>
          <Tag
            style={{
              color: colors.text,
              background: colors.bg,
              borderColor: colors.border,
            }}
          >
            {PROPERTY_STATUS_LABELS[property.status]}
          </Tag>
          <Tooltip title={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}>
            <Button
              type="text"
              size="small"
              icon={isFavorite ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
              onClick={(e) => handleToggleFavorite(property.propertyId, e)}
            />
          </Tooltip>
        </div>

        <div className={styles.cardImage}>
          <HomeOutlined className={styles.cardImageIcon} />
        </div>

        <div className={styles.cardBody}>
          <Tag color="blue" className={styles.typeTag}>
            {PROPERTY_TYPE_LABELS[property.propertyType]}
          </Tag>

          <Title level={5} className={styles.cardTitle}>
            {property.title}
          </Title>

          <div className={styles.cardPrice}>
            {formatPrice(property.price)}
          </div>

          <div className={styles.cardSpecs}>
            {property.rooms && (
              <span className={styles.spec}>
                <AppstoreOutlined /> {property.rooms} комн.
              </span>
            )}
            {property.area && (
              <span className={styles.spec}>
                <ExpandOutlined /> {property.area} м²
              </span>
            )}
          </div>

          {property.address && (
            <div className={styles.cardAddress}>
              <EnvironmentOutlined /> {property.address}
            </div>
          )}

          {property.description && (
            <Paragraph
              type="secondary"
              className={styles.cardDescription}
              ellipsis={{ rows: 2 }}
            >
              {property.description}
            </Paragraph>
          )}
        </div>

        <div className={styles.cardFooter}>
          <Text type="secondary" className={styles.cardDate}>
            {new Date(property.createdAt).toLocaleDateString('ru-RU')}
          </Text>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={(e) => handlePropertyPreview(property, e)}
          >
            Превью
          </Button>
        </div>
      </Card>
    );
  };

  // Рендер списка
  const renderPropertyList = (property: Property) => {
    const colors = PROPERTY_STATUS_COLORS[property.status];
    const isFavorite = favorites.has(property.propertyId);

    return (
      <Card
        key={property.propertyId}
        className={styles.listCard}
        hoverable
        onClick={() => handlePropertyClick(property)}
      >
        <div className={styles.listCardContent}>
          <div className={styles.listCardImage}>
            <HomeOutlined className={styles.listCardImageIcon} />
          </div>

          <div className={styles.listCardInfo}>
            <div className={styles.listCardHeader}>
              <div>
                <Tag color="blue">{PROPERTY_TYPE_LABELS[property.propertyType]}</Tag>
                <Tag
                  style={{
                    color: colors.text,
                    background: colors.bg,
                    borderColor: colors.border,
                  }}
                >
                  {PROPERTY_STATUS_LABELS[property.status]}
                </Tag>
              </div>
              <Button
                type="text"
                icon={isFavorite ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
                onClick={(e) => handleToggleFavorite(property.propertyId, e)}
              />
            </div>

            <Title level={5} className={styles.listCardTitle}>
              {property.title}
            </Title>

            <div className={styles.listCardSpecs}>
              <span className={styles.listCardPrice}>{formatPrice(property.price)}</span>
              {property.rooms && <span>{property.rooms} комн.</span>}
              {property.area && <span>{property.area} м²</span>}
            </div>

            {property.address && (
              <div className={styles.listCardAddress}>
                <EnvironmentOutlined /> {property.address}
              </div>
            )}

            <div className={styles.listCardFooter}>
              <Text type="secondary">
                {new Date(property.createdAt).toLocaleDateString('ru-RU')}
              </Text>
              <Button type="primary" size="small" icon={<EyeOutlined />}>
                Подробнее
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <Title level={2} className={styles.pageTitle}>
            Каталог объектов
          </Title>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadProperties}
              loading={loading}
            >
              Обновить
            </Button>
            <Button
              type="primary"
              icon={<HomeOutlined />}
              onClick={() => navigate('/properties/new')}
            >
              Добавить объект
            </Button>
          </Space>
        </div>
      </div>

      {/* Filters */}
      <Card className={styles.filtersCard}>
        <div className={styles.filtersRow}>
          <Input
            placeholder="Поиск по названию, адресу, описанию..."
            prefix={<SearchOutlined />}
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className={styles.searchInput}
            allowClear
          />

          <Select
            value={filters.propertyType}
            onChange={(value) => handleFilterChange('propertyType', value)}
            className={styles.filterSelect}
            suffixIcon={<FilterOutlined />}
          >
            {TYPE_OPTIONS.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>

          <Select
            value={filters.sortBy}
            onChange={(value) => handleFilterChange('sortBy', value)}
            className={styles.filterSelect}
          >
            {SORT_OPTIONS.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>

          <Segmented
            value={viewMode}
            onChange={(value) => setViewMode(value as 'grid' | 'list')}
            options={[
              { value: 'grid', icon: <AppstoreOutlined /> },
              { value: 'list', icon: <TableOutlined /> },
            ]}
          />

          <Button onClick={handleResetFilters}>Сбросить</Button>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        className={styles.tabs}
        items={[
          { key: 'all', label: `Все объекты (${properties.length})` },
          { key: 'favorites', label: `Избранное (${favorites.size})` },
        ]}
      />

      {/* Content */}
      {loading ? (
        <div className={styles.loadingContainer}>
          <Spin size="large" />
          <Text type="secondary" style={{ marginTop: 16, display: 'block' }}>
            Загрузка объектов...
          </Text>
        </div>
      ) : filteredProperties.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            activeTab === 'favorites'
              ? 'Нет избранных объектов'
              : 'Объекты не найдены'
          }
        >
          {activeTab !== 'favorites' && (
            <Button type="primary" onClick={() => navigate('/properties/new')}>
              Добавить объект
            </Button>
          )}
        </Empty>
      ) : (
        <>
          <div className={styles.resultsInfo}>
            <Text type="secondary">
              Найдено: {filteredProperties.length} объект(ов)
            </Text>
          </div>

          {viewMode === 'grid' ? (
            <div className={styles.gridContainer}>
              {paginatedProperties.map(renderPropertyCard)}
            </div>
          ) : (
            <div className={styles.listContainer}>
              {paginatedProperties.map(renderPropertyList)}
            </div>
          )}

          {filteredProperties.length > 0 && (
            <div className={styles.paginationContainer}>
              <Pagination
                current={currentPage}
                total={filteredProperties.length}
                pageSize={pageSize}
                onChange={handlePageChange}
                onShowSizeChange={handlePageChange}
                showSizeChanger
                pageSizeOptions={['12', '24', '48', '96']}
                showTotal={(total, range) => `${range[0]}-${range[1]} из ${total}`}
                locale={{ items_per_page: '/ стр.' }}
              />
            </div>
          )}
        </>
      )}

      {/* Property Detail Modal */}
      <Modal
        title={
          <Space>
            <HomeOutlined />
            <span>Информация об объекте</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setSelectedProperty(null);
        }}
        footer={
          <Space>
            <Button onClick={() => setModalVisible(false)}>
              Закрыть
            </Button>
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={() => {
                if (selectedProperty) {
                  navigate(`/properties/${selectedProperty.propertyId}`);
                }
              }}
            >
              Подробнее
            </Button>
          </Space>
        }
        width={700}
      >
        {selectedProperty && (
          <div className={styles.modalContent}>
            <div className={styles.modalImage}>
              <HomeOutlined className={styles.modalImageIcon} />
            </div>

            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Название">
                <Text strong>{selectedProperty.title}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Тип">
                <Tag color="blue">
                  {PROPERTY_TYPE_LABELS[selectedProperty.propertyType]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Цена">
                <Text strong style={{ color: '#137333', fontSize: 18 }}>
                  {formatPrice(selectedProperty.price)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Адрес">
                <Space>
                  <EnvironmentOutlined />
                  {selectedProperty.address || 'Не указан'}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Площадь">
                {selectedProperty.area ? `${selectedProperty.area} м²` : 'Не указана'}
              </Descriptions.Item>
              <Descriptions.Item label="Комнат">
                {selectedProperty.rooms || 'Не указано'}
              </Descriptions.Item>
              <Descriptions.Item label="Описание">
                {selectedProperty.description || 'Не указано'}
              </Descriptions.Item>
              <Descriptions.Item label="Статус">
                <Tag
                  style={{
                    color: PROPERTY_STATUS_COLORS[selectedProperty.status].text,
                    background: PROPERTY_STATUS_COLORS[selectedProperty.status].bg,
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

export default PropertiesCatalogPage;

