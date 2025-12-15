import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftOutlined,
  EnvironmentOutlined,
  ExpandOutlined,
  HomeOutlined,
  PhoneOutlined,
  CalendarOutlined,
  HeartOutlined,
  HeartFilled,
  ShareAltOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Descriptions,
  Spin,
  Tag,
  Typography,
  Space,
  message,
  Tooltip,
  Breadcrumb,
} from 'antd';
import { propertiesAPI } from '../../api';
import type { Property, PropertyStatus } from '../../types';
import { PROPERTY_TYPE_LABELS, PROPERTY_STATUS_LABELS } from '../../types';
import styles from './styles.module.css';

const { Title, Text, Paragraph } = Typography;

// Цвета для статусов
const PROPERTY_STATUS_COLORS: Record<PropertyStatus, { text: string; bg: string; border: string }> = {
  PROPERTY_STATUS_UNSPECIFIED: { text: '#8c8c8c', bg: '#fafafa', border: '#d9d9d9' },
  PROPERTY_STATUS_NEW: { text: '#D97706', bg: '#FEF3C7', border: '#FCD34D' },
  PROPERTY_STATUS_PUBLISHED: { text: '#059669', bg: '#D1FAE5', border: '#6EE7B7' },
  PROPERTY_STATUS_SOLD: { text: '#7C3AED', bg: '#EDE9FE', border: '#C4B5FD' },
  PROPERTY_STATUS_DELETED: { text: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' },
};

const PropertyDetailPage = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const loadProperty = async () => {
      if (!propertyId) {
        message.error('ID объекта не указан');
        navigate(-1);
        return;
      }

      try {
        setLoading(true);
        const propertyData = await propertiesAPI.getPropertyById(propertyId);
        setProperty(propertyData);
      } catch (error) {
        console.error('Ошибка загрузки объекта:', error);
        message.error('Не удалось загрузить информацию об объекте');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    loadProperty();
  }, [propertyId, navigate]);

  const formatPrice = (price: string | undefined): string => {
    if (!price) return '—';
    const num = parseInt(price, 10);
    if (isNaN(num)) return price;
    return new Intl.NumberFormat('ru-RU').format(num) + ' ₽';
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite);
    message.success(isFavorite ? 'Удалено из избранного' : 'Добавлено в избранное');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    message.success('Ссылка скопирована в буфер обмена');
  };


  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
        <Text type="secondary" style={{ marginTop: 16 }}>
          Загрузка объекта...
        </Text>
      </div>
    );
  }

  if (!property) {
    return (
      <div className={styles.errorContainer}>
        <HomeOutlined className={styles.errorIcon} />
        <Title level={4}>Объект не найден</Title>
        <Button type="primary" onClick={() => navigate('/properties-catalog')}>
          Вернуться в каталог
        </Button>
      </div>
    );
  }

  const statusColors = PROPERTY_STATUS_COLORS[property.status];

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <Breadcrumb
        className={styles.breadcrumb}
        items={[
          { title: <a onClick={() => navigate('/properties-catalog')}>Каталог объектов</a> },
          { title: property.title },
        ]}
      />

      {/* Header */}
      <div className={styles.header}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          className={styles.backButton}
        >
          Назад
        </Button>

        <Space>
          <Tooltip title={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}>
            <Button
              type="text"
              icon={isFavorite ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
              onClick={handleToggleFavorite}
            />
          </Tooltip>
          <Tooltip title="Поделиться">
            <Button type="text" icon={<ShareAltOutlined />} onClick={handleShare} />
          </Tooltip>
        </Space>
      </div>

      <div className={styles.content}>
        {/* Левая колонка - изображение и основная информация */}
        <div className={styles.mainColumn}>
          {/* Изображение */}
          <Card className={styles.imageCard}>
            <div className={styles.imageContainer}>
              <HomeOutlined className={styles.placeholderIcon} />
            </div>
            <div className={styles.badges}>
              <Tag
                style={{
                  color: statusColors.text,
                  background: statusColors.bg,
                  borderColor: statusColors.border,
                  fontSize: 14,
                  padding: '4px 12px',
                }}
              >
                {PROPERTY_STATUS_LABELS[property.status]}
              </Tag>
              <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
                {PROPERTY_TYPE_LABELS[property.propertyType]}
              </Tag>
            </div>
          </Card>

          {/* Описание */}
          <Card className={styles.descriptionCard} title="Описание">
            <Paragraph className={styles.description}>
              {property.description || 'Описание не указано'}
            </Paragraph>
          </Card>
        </div>

        {/* Правая колонка - детали */}
        <div className={styles.sideColumn}>
          {/* Заголовок и цена */}
          <Card className={styles.titleCard}>
            <Title level={2} className={styles.title}>
              {property.title}
            </Title>

            <div className={styles.price}>
              {formatPrice(property.price)}
            </div>

            {property.address && (
              <div className={styles.address}>
                <EnvironmentOutlined />
                <span>{property.address}</span>
              </div>
            )}
          </Card>

          {/* Характеристики */}
          <Card className={styles.specsCard} title="Характеристики">
            <div className={styles.specsGrid}>
              <div className={styles.specItem}>
                <div className={styles.specIcon}>
                  <ExpandOutlined />
                </div>
                <div className={styles.specInfo}>
                  <Text type="secondary" className={styles.specLabel}>Площадь</Text>
                  <Text strong className={styles.specValue}>
                    {property.area ? `${property.area} м²` : '—'}
                  </Text>
                </div>
              </div>

              <div className={styles.specItem}>
                <div className={styles.specIcon}>
                  <HomeOutlined />
                </div>
                <div className={styles.specInfo}>
                  <Text type="secondary" className={styles.specLabel}>Комнаты</Text>
                  <Text strong className={styles.specValue}>
                    {property.rooms || '—'}
                  </Text>
                </div>
              </div>

              <div className={styles.specItem}>
                <div className={styles.specIcon}>
                  <CalendarOutlined />
                </div>
                <div className={styles.specInfo}>
                  <Text type="secondary" className={styles.specLabel}>Дата публикации</Text>
                  <Text strong className={styles.specValue}>
                    {formatDate(property.createdAt)}
                  </Text>
                </div>
              </div>
            </div>
          </Card>

          {/* Полная информация */}
          <Card className={styles.detailsCard} title="Полная информация">
            <Descriptions column={1} size="small" className={styles.descriptions}>
              <Descriptions.Item label="Название">
                {property.title}
              </Descriptions.Item>
              <Descriptions.Item label="Тип объекта">
                {PROPERTY_TYPE_LABELS[property.propertyType]}
              </Descriptions.Item>
              <Descriptions.Item label="Цена">
                {formatPrice(property.price)}
              </Descriptions.Item>
              <Descriptions.Item label="Адрес">
                {property.address || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Площадь">
                {property.area ? `${property.area} м²` : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Количество комнат">
                {property.rooms || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Статус">
                <Tag
                  style={{
                    color: statusColors.text,
                    background: statusColors.bg,
                    borderColor: statusColors.border,
                  }}
                >
                  {PROPERTY_STATUS_LABELS[property.status]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Дата создания">
                {formatDate(property.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Последнее обновление">
                {formatDate(property.updatedAt)}
              </Descriptions.Item>
              <Descriptions.Item label="ID объекта">
                <Text copyable type="secondary" style={{ fontSize: 12 }}>
                  {property.propertyId}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Кнопка связи */}
          <Card className={styles.contactCard}>
            <Button
              type="primary"
              size="large"
              block
              icon={<PhoneOutlined />}
              className={styles.contactButton}
            >
              Связаться с продавцом
            </Button>
            <Text type="secondary" className={styles.contactHint}>
              Нажмите, чтобы получить контактные данные
            </Text>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetailPage;

