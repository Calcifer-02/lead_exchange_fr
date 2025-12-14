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
  Modal,
  Form,
  InputNumber,
  message,
  Card,
  Divider,
} from 'antd';
import {
  ArrowLeftOutlined,
  HeartOutlined,
  PhoneOutlined,
  MailOutlined,
  FileTextOutlined,
  UserOutlined,
  CalendarOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { leadsAPI, dealsAPI } from '../../api';
import type { Lead } from '../../types';
import type { CreateDealRequest } from '../../types/deals';
import { LEAD_STATUS_LABELS } from '../../types/leads';
import styles from './styles.module.css';

const { Title, Text, Paragraph } = Typography;

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

const STATUS_OPTIONS = [
  { value: 'LEAD_STATUS_NEW', label: 'Новый', color: 'blue' },
  { value: 'LEAD_STATUS_PUBLISHED', label: 'Опубликован', color: 'green' },
  { value: 'LEAD_STATUS_PURCHASED', label: 'Куплен', color: 'orange' },
  { value: 'LEAD_STATUS_DELETED', label: 'Удалён', color: 'red' },
  { value: 'LEAD_STATUS_UNSPECIFIED', label: 'Не указан', color: 'gray' },
];

// Парсинг requirement из JSON или base64
const parseRequirement = (requirement: string): ParsedRequirement => {
  if (!requirement) return {};

  try {
    return JSON.parse(requirement);
  } catch {
    try {
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
        setLead({
          ...response.lead,
          parsedRequirement: parseRequirement(response.lead.requirement)
        });

        const savedFavorites = localStorage.getItem('leads-favorites');
        if (savedFavorites) {
          setFavorites(new Set(JSON.parse(savedFavorites)));
        }
      } catch {
        setError('Не удалось загрузить данные лида');
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
  }, [id]);

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

  const getStatusLabel = (status: string) => {
    return LEAD_STATUS_LABELS[status as keyof typeof LEAD_STATUS_LABELS] ||
           STATUS_OPTIONS.find(s => s.value === status)?.label ||
           'Не указан';
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
    const contact = method === 'phone' ? lead.contactPhone : lead.contactEmail;

    if (method === 'phone' && contact) {
      window.open(`tel:${contact}`);
    } else if (contact) {
      window.open(`mailto:${contact}`);
    }
  };

  const handleShare = async () => {
    if (!lead) return;
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

  const handleCreateDeal = async (price: number) => {
    if (!lead) {
      message.error('Лид не найден');
      return;
    }

    if (!price || price <= 0) {
      message.error('Введите корректную сумму сделки');
      return;
    }

    if (!lead.leadId) {
      message.error('ID лида не найден');
      return;
    }

    try {
      setSubmitting(true);

      const dealData: CreateDealRequest = {
        leadId: lead.leadId,
        price: Number(price)
      };
      await dealsAPI.createDeal(dealData);

      message.success('Сделка успешно создана');
      setModalVisible(false);
      navigate('/deals');
    } catch (error: unknown) {
      const isAxiosError = (err: unknown): err is {
        response?: {
          status: number;
          data?: { message?: string };
        };
        request?: unknown;
        message?: string;
      } => {
        return typeof err === 'object' && err !== null;
      };

      const isError = (err: unknown): err is Error => {
        return err instanceof Error;
      };

      if (isAxiosError(error)) {
        if (error.response) {
          const status = error.response.status;
          const errorData = error.response.data;

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
          style={{ marginTop: 16 }}
        >
          Вернуться к каталогу
        </Button>
      </div>
    );
  }

  const requirement = lead.parsedRequirement;
  const price = requirement.preferredPrice || requirement.price;
  const isFav = isFavorite(lead.leadId);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/leads-catalog')}
          className={styles.backButton}
        >
          Назад к каталогу
        </Button>
      </div>

      <Row gutter={[24, 24]}>
        {/* Основная информация */}
        <Col xs={24} lg={16}>
          <Card className={styles.mainCard}>
            <div className={styles.titleSection}>
              <div className={styles.titleRow}>
                <FileTextOutlined className={styles.leadIcon} />
                <div>
                  <Title level={2} style={{ marginBottom: 8 }}>{lead.title}</Title>
                  <Space>
                    <Tag color={getStatusColor(lead.status)}>
                      {getStatusLabel(lead.status)}
                    </Tag>
                    <Text type="secondary">
                      <CalendarOutlined /> Создан: {formatDate(lead.createdAt)}
                    </Text>
                  </Space>
                </div>
              </div>

              {price && (
                <div className={styles.priceBlock}>
                  <Text type="secondary">Желаемая цена</Text>
                  <Title level={3} className={styles.price}>
                    {formatPrice(price)}
                  </Title>
                </div>
              )}
            </div>

            <Divider />

            <div className={styles.descriptionSection}>
              <Title level={4}>Описание</Title>
              <Paragraph className={styles.description}>
                {lead.description || 'Описание отсутствует'}
              </Paragraph>
            </div>

            {/* Дополнительные параметры из requirement */}
            {(requirement.roomNumber || requirement.district || requirement.region) && (
              <>
                <Divider />
                <div className={styles.requirementSection}>
                  <Title level={4}>Требования</Title>
                  <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
                    {requirement.roomNumber && (
                      <Descriptions.Item label="Количество комнат">
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
                  </Descriptions>
                </div>
              </>
            )}

            <Divider />

            <div className={styles.metaSection}>
              <Text type="secondary">
                Обновлён: {formatDate(lead.updatedAt)}
              </Text>
            </div>
          </Card>
        </Col>

        {/* Боковая панель */}
        <Col xs={24} lg={8}>
          {/* Контактная информация */}
          <Card className={styles.contactCard} title="Контактная информация">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div className={styles.contactItem}>
                <UserOutlined className={styles.contactIcon} />
                <div>
                  <Text type="secondary">Имя</Text>
                  <div><Text strong>{lead.contactName}</Text></div>
                </div>
              </div>

              <div className={styles.contactItem}>
                <PhoneOutlined className={styles.contactIcon} />
                <div>
                  <Text type="secondary">Телефон</Text>
                  <div>
                    <a href={`tel:${lead.contactPhone}`}>
                      <Text strong>{lead.contactPhone}</Text>
                    </a>
                  </div>
                </div>
              </div>

              {lead.contactEmail && (
                <div className={styles.contactItem}>
                  <MailOutlined className={styles.contactIcon} />
                  <div>
                    <Text type="secondary">Email</Text>
                    <div>
                      <a href={`mailto:${lead.contactEmail}`}>
                        <Text strong>{lead.contactEmail}</Text>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </Space>
          </Card>

          {/* Действия */}
          <Card className={styles.actionsCard} title="Действия">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Button
                type="primary"
                size="large"
                block
                icon={<HeartOutlined />}
                onClick={() => navigate(`/leads/${lead.leadId}/matching`)}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                }}
              >
                Подобрать объекты
              </Button>

              <Button
                size="large"
                block
                onClick={() => setModalVisible(true)}
              >
                Начать сделку
              </Button>

              <Button
                size="large"
                block
                icon={<PhoneOutlined />}
                onClick={() => handleContact('phone')}
              >
                Позвонить
              </Button>

              <Button
                size="large"
                block
                icon={<MailOutlined />}
                onClick={() => handleContact('email')}
              >
                Написать на email
              </Button>

              <Divider style={{ margin: '12px 0' }} />

              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Button
                  icon={<HeartOutlined style={{ color: isFav ? '#ff4d4f' : undefined }} />}
                  onClick={() => toggleFavorite(lead.leadId)}
                >
                  {isFav ? 'В избранном' : 'В избранное'}
                </Button>
                <Button
                  icon={<ShareAltOutlined />}
                  onClick={handleShare}
                >
                  Поделиться
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Модальное окно создания сделки */}
      <Modal
        title="Создание сделки"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={500}
      >
        <div className={styles.dealInfo}>
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Text strong>{lead.title}</Text>
            {price && (
              <Text type="secondary">
                Желаемая цена: {formatPrice(price)}
              </Text>
            )}
            <Text type="secondary">
              Контакт: {lead.contactName}
            </Text>
          </Space>
        </div>

        <Form
          layout="vertical"
          onFinish={(values) => handleCreateDeal(values.amount)}
          initialValues={{
            amount: price ? parseFloat(String(price)) : undefined
          }}
        >
          <Form.Item
            label="Сумма сделки (₽)"
            name="amount"
            rules={[
              { required: true, message: 'Введите сумму сделки' },
              { type: 'number', min: 1, message: 'Сумма должна быть больше 0' }
            ]}
            extra="Укажите сумму, за которую вы готовы приобрести этот лид"
          >
            <InputNumber
              style={{ width: '100%' }}
              size="large"
              min={1}
              formatter={value => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''}
              parser={(value) => (value ? Number(value.replace(/\s/g, '')) : 0) as unknown as 1}
              placeholder="Введите сумму"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setModalVisible(false)}>
                Отмена
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Создать сделку
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LeadDetailPage;
