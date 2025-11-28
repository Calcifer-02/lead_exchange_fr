import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Spin,
  Button,
  Row,
  Col,
  Typography,
  Descriptions,
  Tag,
  Space,
  Alert,
  Rate,
  Modal,
  Form,
  InputNumber,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  HeartOutlined,
  PhoneOutlined,
  MailOutlined,
  HomeOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { leadsAPI, dealsAPI } from '../../api';
import type { Lead } from '../../types';
import type { CreateDealRequest } from '../../types/deals';
import styles from './styles.module.css';

const { Title, Text, Paragraph } = Typography;

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

const LeadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<ParsedLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchLead = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        const response = await leadsAPI.getLead(id);
        setLead({ ...response.lead, requirementData: getRequirementData(response.lead) });

        // Загрузка избранного
        const savedFavorites = localStorage.getItem('leads-favorites');
        if (savedFavorites) {
          setFavorites(new Set(JSON.parse(savedFavorites)));
        }
      } catch  {
        setError('Не удалось загрузить данные лида');
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
  }, [id]);

  const getRequirementData = (lead: Lead) => {
    try {
      const decoded = decodeURIComponent(escape(atob(lead.requirement)));
      const data = JSON.parse(decoded);

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
    } catch {
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

  const getPropertyTypeLabel = (value: string) => {
    return PROPERTY_TYPES.find(pt => pt.value === value)?.label || value;
  };

  const getDealTypeLabel = (value: string) => {
    return DEAL_TYPES.find(dt => dt.value === value)?.label || value;
  };

  const getBuildingTypeLabel = (value: string) => {
    return value === 'new' ? 'Новостройка' : value === 'secondary' ? 'Вторичка' : value;
  };

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

  const handleContact = (method: 'phone' | 'email') => {
    if (!lead) return;
    const requirementData = lead.requirementData;
    const contact = method === 'phone' ? requirementData.phone : requirementData.email;

    if (method === 'phone' && contact) {
      window.open(`tel:${contact}`);
    } else if (contact) {
      window.open(`mailto:${contact}`);
    }
  };

  // Добавлен вывод отладочной информации для createDeal
  const handleCreateDeal = async (price: number) => {
    if (!lead) {
      message.error('Лид не найден');
      return;
    }

    // Валидация данных
    if (!price || price <= 0) {
      message.error('Введите корректную сумму сделки');
      return;
    }

    // Проверяем, что leadId существует
    if (!lead.leadId) {
      message.error('ID лида не найден');
      return;
    }

    try {
      setSubmitting(true);

      // Используем правильный формат данных
      const dealData: CreateDealRequest = {
        leadId: lead.leadId,
        price: Number(price)
      };
      await dealsAPI.createDeal(dealData);

      message.success('Сделка успешно создана');
      setModalVisible(false);

      // Переходим на страницу сделок
      navigate('/deals');
    } catch (error: unknown) {

      // Type guard для AxiosError
      const isAxiosError = (err: unknown): err is {
        response?: {
          status: number;
          data?: { message?: string };
          headers?: unknown;
        };
        request?: unknown;
        message?: string;
      } => {
        return typeof err === 'object' && err !== null;
      };

      // Type guard для стандартной ошибки
      const isError = (err: unknown): err is Error => {
        return err instanceof Error;
      };

      // Детальная обработка ошибок
      if (isAxiosError(error)) {
        if (error.response) {
          const status = error.response.status;
          const errorData = error.response.data;

          console.error('Детали ошибки:', {
            status,
            data: errorData,
            headers: error.response.headers
          });

          switch (status) {
            case 400:
              message.error(errorData?.message || 'Неверные данные для создания сделки');
              break;
            case 409:
              message.error('Сделка для этого лида уже существует');
              break;
            case 500:
              message.error('Ошибка сервера: ' + (errorData?.message || 'Внутренняя ошибка сервера'));
              break;
            default:
              message.error(errorData?.message || `Ошибка ${status} при создании сделки`);
          }
        } else if (error.request) {
          message.error('Не удалось подключиться к серверу. Проверьте подключение.');
        } else {
          message.error('Неизвестная ошибка: ' + (error.message || 'Неизвестная ошибка'));
        }
      } else if (isError(error)) {
        message.error('Ошибка: ' + error.message);
      } else {
        message.error('Произошла неизвестная ошибка');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
        <Text style={{ marginTop: 16, display: 'block' }}>Загрузка лида...</Text>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className={styles.page}>
        <Alert
          message="Ошибка"
          description={error || 'Лид не найден'}
          type="error"
          showIcon
        />
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/leads-catalog')}
          className={styles.backButton}
        >
          Вернуться к каталогу
        </Button>
      </div>
    );
  }

  const requirementData = lead.requirementData;
  const isFav = isFavorite(lead.leadId);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/leads-catalog')}
          className={styles.backButton}
        >
          Назад к каталогу
        </Button>
        <Title level={1}>{lead.title}</Title>
        <Space>
          <Button
            icon={<HeartOutlined style={{ color: isFav ? '#ff4d4f' : undefined }} />}
            onClick={() => toggleFavorite(lead.leadId)}
          >
            {isFav ? 'В избранном' : 'В избранное'}
          </Button>
          <Button icon={<PhoneOutlined />} onClick={() => handleContact('phone')}>
            Позвонить
          </Button>
          <Button icon={<MailOutlined />} onClick={() => handleContact('email')}>
            Написать
          </Button>
          <Button type="primary" onClick={() => setModalVisible(true)}>
            Начать сделку
          </Button>
        </Space>
      </div>

      <Row gutter={24}>
        <Col xs={24} lg={12}>
          {requirementData.photos?.[0] ? (
            <img
              src={`data:image/jpeg;base64,${requirementData.photos[0]}`}
              alt={lead.title}
              className={styles.leadImage}
            />
          ) : (
            <div className={styles.noImage}>
              <HomeOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
            </div>
          )}
        </Col>
        <Col xs={24} lg={12}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={4}>Описание</Title>
              <Paragraph>{lead.description}</Paragraph>
            </div>

            <Descriptions title="Характеристики" bordered column={1} size="small">
              <Descriptions.Item label="Статус">
                <Tag color={getStatusColor(lead.status)}>
                  {STATUS_OPTIONS.find(s => s.value === lead.status)?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Цена">
                {formatPrice(requirementData.price)}
                {requirementData.dealType === 'rent' && ' / месяц'}
              </Descriptions.Item>
              <Descriptions.Item label="Город">{requirementData.city}</Descriptions.Item>
              <Descriptions.Item label="Адрес">{requirementData.address}</Descriptions.Item>
              <Descriptions.Item label="Тип объекта">{getPropertyTypeLabel(requirementData.propertyType)}</Descriptions.Item>
              <Descriptions.Item label="Тип сделки">{getDealTypeLabel(requirementData.dealType)}</Descriptions.Item>
              <Descriptions.Item label="Комнаты">{requirementData.rooms}</Descriptions.Item>
              <Descriptions.Item label="Площадь">{requirementData.area} м²</Descriptions.Item>
              <Descriptions.Item label="Этаж">{requirementData.floor}/{requirementData.floorsTotal}</Descriptions.Item>
              <Descriptions.Item label="Тип дома">{getBuildingTypeLabel(requirementData.buildingType)}</Descriptions.Item>
              <Descriptions.Item label="Создан">{formatDate(lead.createdAt)}</Descriptions.Item>
              {requirementData.rating && (
                <Descriptions.Item label="Рейтинг">
                  <Rate disabled defaultValue={requirementData.rating} />
                </Descriptions.Item>
              )}
            </Descriptions>

            <div>
              <Title level={4}>Контактная информация</Title>
              <Space direction="vertical">
                <Text><UserOutlined /> {lead.contactName}</Text>
                <Text><PhoneOutlined /> {lead.contactPhone}</Text>
                <Text><MailOutlined /> {lead.contactEmail}</Text>
              </Space>
            </div>
          </Space>
        </Col>
      </Row>

      <Modal
        title="Создание сделки"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          layout="vertical"
          onFinish={(values) => handleCreateDeal(values.amount)}
          initialValues={{ leadId: lead.leadId }}
        >
          <Form.Item
            label="Сумма сделки"
            name="amount"
            rules={[{ required: true, message: 'Введите сумму сделки' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={value => `${value}`}
              parser={(value) => value ? Number(value.replace(' ₽', '').replace(/\s/g, '')) : 0}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Создать сделку
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LeadDetailPage;
