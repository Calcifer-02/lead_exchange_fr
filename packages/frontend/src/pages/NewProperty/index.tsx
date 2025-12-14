import { useState } from 'react';
import {
  ArrowLeftOutlined,
  HomeOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  ExpandOutlined,
  AppstoreOutlined,
  SendOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Select,
  Typography,
  Divider,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { propertiesAPI } from '../../api';
import type { CreatePropertyRequest, PropertyType } from '../../types';
import { PROPERTY_TYPE_LABELS } from '../../types';
import styles from './styles.module.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface FormValues {
  title: string;
  description: string;
  address: string;
  price: number | undefined;
  area: number | undefined;
  rooms: number | undefined;
  propertyType: PropertyType;
}

const INITIAL_VALUES: FormValues = {
  title: '',
  description: '',
  address: '',
  price: undefined,
  area: undefined,
  rooms: undefined,
  propertyType: 'PROPERTY_TYPE_APARTMENT',
};

const PROPERTY_TYPE_OPTIONS = [
  { value: 'PROPERTY_TYPE_APARTMENT', label: PROPERTY_TYPE_LABELS.PROPERTY_TYPE_APARTMENT },
  { value: 'PROPERTY_TYPE_HOUSE', label: PROPERTY_TYPE_LABELS.PROPERTY_TYPE_HOUSE },
  { value: 'PROPERTY_TYPE_COMMERCIAL', label: PROPERTY_TYPE_LABELS.PROPERTY_TYPE_COMMERCIAL },
  { value: 'PROPERTY_TYPE_LAND', label: PROPERTY_TYPE_LABELS.PROPERTY_TYPE_LAND },
];

const formatPrice = (value: number | undefined): string => {
  if (value === undefined || value === null) return '—';
  return new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
};

const NewPropertyPage = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);

  const values = Form.useWatch([], form) as FormValues | undefined;
  const currentValues = values ?? INITIAL_VALUES;

  const handleSubmit = async () => {
    try {
      const formValues = await form.validateFields();
      setSubmitting(true);

      const propertyData: CreatePropertyRequest = {
        title: formValues.title,
        description: formValues.description,
        address: formValues.address,
        price: formValues.price?.toString() || '0',
        area: formValues.area || 0,
        rooms: formValues.rooms || 0,
        propertyType: formValues.propertyType,
      };

      await propertiesAPI.createProperty(propertyData);

      message.success('Объект недвижимости создан и отправлен на модерацию!');
      navigate('/my-objects');
    } catch (error) {
      console.error('Failed to create property:', error);

      if (error instanceof Error) {
        message.error(error.message || 'Не удалось создать объект');
      } else {
        message.error('Не удалось создать объект');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={handleGoBack}
          className={styles.backButton}
        >
          Назад
        </Button>
        <Title level={2} className={styles.title}>
          Новый объект недвижимости
        </Title>
        <div className={styles.headerSpacer} />
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Form Card */}
        <Card className={styles.formCard}>
          <Form<FormValues>
            form={form}
            layout="vertical"
            initialValues={INITIAL_VALUES}
            className={styles.form}
          >
            {/* Основная информация */}
            <div className={styles.section}>
              <Title level={4} className={styles.sectionTitle}>
                <HomeOutlined className={styles.sectionIcon} />
                Основная информация
              </Title>

              <Form.Item
                name="title"
                label="Название объекта"
                rules={[
                  { required: true, message: 'Введите название' },
                  { min: 3, message: 'Минимум 3 символа' },
                ]}
              >
                <Input
                  placeholder="Например: 2-комнатная квартира в центре"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="propertyType"
                label="Тип недвижимости"
                rules={[{ required: true, message: 'Выберите тип' }]}
              >
                <Select
                  placeholder="Выберите тип"
                  options={PROPERTY_TYPE_OPTIONS}
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="description"
                label="Описание"
                rules={[
                  { required: true, message: 'Введите описание' },
                  { min: 10, message: 'Минимум 10 символов' },
                ]}
              >
                <TextArea
                  placeholder="Опишите объект недвижимости подробнее..."
                  rows={4}
                  showCount
                  maxLength={2000}
                />
              </Form.Item>
            </div>

            <Divider />

            {/* Адрес */}
            <div className={styles.section}>
              <Title level={4} className={styles.sectionTitle}>
                <EnvironmentOutlined className={styles.sectionIcon} />
                Местоположение
              </Title>

              <Form.Item
                name="address"
                label="Адрес"
                rules={[
                  { required: true, message: 'Введите адрес' },
                  { min: 5, message: 'Минимум 5 символов' },
                ]}
              >
                <Input
                  placeholder="Город, улица, дом"
                  size="large"
                />
              </Form.Item>
            </div>

            <Divider />

            {/* Характеристики */}
            <div className={styles.section}>
              <Title level={4} className={styles.sectionTitle}>
                <AppstoreOutlined className={styles.sectionIcon} />
                Характеристики
              </Title>

              <div className={styles.fieldRow}>
                <Form.Item
                  name="rooms"
                  label="Количество комнат"
                  rules={[{ required: true, message: 'Укажите количество комнат' }]}
                >
                  <InputNumber
                    placeholder="3"
                    min={1}
                    max={20}
                    size="large"
                    className={styles.fullWidth}
                  />
                </Form.Item>

                <Form.Item
                  name="area"
                  label="Площадь (м²)"
                  rules={[{ required: true, message: 'Укажите площадь' }]}
                >
                  <InputNumber
                    placeholder="65"
                    min={1}
                    max={10000}
                    size="large"
                    className={styles.fullWidth}
                  />
                </Form.Item>
              </div>
            </div>

            <Divider />

            {/* Цена */}
            <div className={styles.section}>
              <Title level={4} className={styles.sectionTitle}>
                <DollarOutlined className={styles.sectionIcon} />
                Стоимость
              </Title>

              <Form.Item
                name="price"
                label="Цена (₽)"
                rules={[{ required: true, message: 'Укажите цену' }]}
              >
                <InputNumber
                  placeholder="5 000 000"
                  min={0}
                  size="large"
                  className={styles.fullWidth}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                  parser={(value) => {
                    const parsed = Number(value?.replace(/\s/g, '') || 0);
                    return parsed as 0;
                  }}
                />
              </Form.Item>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              <Button
                size="large"
                onClick={handleGoBack}
              >
                Отмена
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<SendOutlined />}
                onClick={handleSubmit}
                loading={submitting}
              >
                Создать объект
              </Button>
            </div>
          </Form>
        </Card>

        {/* Preview Card */}
        <div className={styles.previewWrapper}>
          <Card className={styles.previewCard} title="Предпросмотр">
            <div className={styles.previewContent}>
              <div className={styles.previewImage}>
                <HomeOutlined className={styles.previewIcon} />
              </div>

              <div className={styles.previewInfo}>
                <Title level={4} className={styles.previewTitle}>
                  {currentValues.title || 'Название объекта'}
                </Title>

                <Text className={styles.previewType}>
                  {PROPERTY_TYPE_LABELS[currentValues.propertyType] || 'Тип не указан'}
                </Text>

                <div className={styles.previewPrice}>
                  {formatPrice(currentValues.price)}
                </div>

                <div className={styles.previewSpecs}>
                  {currentValues.rooms && (
                    <span className={styles.previewSpec}>
                      <AppstoreOutlined /> {currentValues.rooms} комн.
                    </span>
                  )}
                  {currentValues.area && (
                    <span className={styles.previewSpec}>
                      <ExpandOutlined /> {currentValues.area} м²
                    </span>
                  )}
                </div>

                {currentValues.address && (
                  <div className={styles.previewAddress}>
                    <EnvironmentOutlined /> {currentValues.address}
                  </div>
                )}

                {currentValues.description && (
                  <Text type="secondary" className={styles.previewDescription}>
                    {currentValues.description.length > 150
                      ? currentValues.description.slice(0, 150) + '...'
                      : currentValues.description}
                  </Text>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NewPropertyPage;

