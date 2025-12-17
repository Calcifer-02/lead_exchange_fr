import { useEffect, useMemo, useState } from 'react';
import {
  ApartmentOutlined,
  BarChartOutlined,
  DollarOutlined,
  HomeOutlined,
  LoadingOutlined,
  PictureOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { Button, Card, Form, Input, InputNumber, message, Select, Space, Typography, Upload } from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import type { RcFile } from 'antd/es/upload';
import { useNavigate } from 'react-router-dom';
import { leadsAPI } from '../../api';
import type { CreateLeadRequest, PropertyType } from '../../types';
import { PROPERTY_TYPE_LABELS } from '../../types';
import ImageGallery from '../../components/ImageGallery';
import styles from './styles.module.css';

type DealType = 'sale' | 'rent';
type BuildingType = 'new' | 'secondary';

interface FormValues {
  title: string;
  city: string;
  address: string;
  price: number | undefined;
  area: number | undefined;
  floor: number | undefined;
  floorsTotal: number | undefined;
  rooms: number | undefined;
  propertyType: PropertyType;
  dealType: DealType;
  description: string;
  buildingType: BuildingType;
}

const INITIAL_VALUES: FormValues = {
  title: '',
  city: '',
  address: '',
  price: undefined,
  area: undefined,
  floor: undefined,
  floorsTotal: undefined,
  rooms: undefined,
  propertyType: 'PROPERTY_TYPE_APARTMENT',
  dealType: 'sale',
  description: '',
  buildingType: 'new',
};

const PROPERTY_TYPE_OPTIONS = [
  { value: 'PROPERTY_TYPE_APARTMENT', label: PROPERTY_TYPE_LABELS.PROPERTY_TYPE_APARTMENT },
  { value: 'PROPERTY_TYPE_HOUSE', label: PROPERTY_TYPE_LABELS.PROPERTY_TYPE_HOUSE },
  { value: 'PROPERTY_TYPE_COMMERCIAL', label: PROPERTY_TYPE_LABELS.PROPERTY_TYPE_COMMERCIAL },
  { value: 'PROPERTY_TYPE_LAND', label: PROPERTY_TYPE_LABELS.PROPERTY_TYPE_LAND },
];

const formatPrice = (value?: number) =>
  typeof value === 'number' ? new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0 }).format(value) : '—';

const NewObjectPage = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const values = Form.useWatch([], form) as FormValues | undefined;
  const currentValues = values ?? INITIAL_VALUES;

  const previewImage = useMemo(
    () => fileList[0]?.url ?? fileList[0]?.thumbUrl,
    [fileList]
  );

  // Cleanup blob URLs при размонтировании компонента
  useEffect(() => {
    return () => {
      fileList.forEach((file) => {
        if (file.url?.startsWith('blob:')) {
          URL.revokeObjectURL(file.url);
        }
      });
    };
  }, [fileList]);

  const handleUploadChange: UploadProps['onChange'] = async ({ file, fileList: newFileList }) => {
    setFileList(newFileList);

    // Если файл в процессе загрузки и это новый файл (не из начальных)
    if (file.status === 'uploading' && file.originFileObj) {
      setUploading(true);

      // Создаем локальный blob URL для немедленного preview
      const blobUrl = URL.createObjectURL(file.originFileObj);

      try {
        // Конвертируем файл в base64
        const base64 = await fileToBase64(file.originFileObj);

        // Обновляем fileList с blob URL для preview и сохраняем base64 в data
        const updatedFileList = newFileList.map((f) => {
          if (f.uid === file.uid) {
            return {
              ...f,
              status: 'done' as const,
              url: blobUrl, // Используем blob URL для отображения
              response: { base64 }, // Сохраняем base64 для requirement
            };
          }
          return f;
        });

        setFileList(updatedFileList);
        message.success(`${file.name} успешно загружен`);
      } catch  {

        // Очищаем blob URL при ошибке
        URL.revokeObjectURL(blobUrl);

        message.error(`Не удалось обработать ${file.name}`);

        // Помечаем файл как ошибочный
        const updatedFileList = newFileList.map((f) => {
          if (f.uid === file.uid) {
            return {
              ...f,
              status: 'error' as const,
            };
          }
          return f;
        });
        setFileList(updatedFileList);
      } finally {
        setUploading(false);
      }
    }
  };

  const beforeUpload = (file: RcFile) => {
    // Список поддерживаемых форм��тов согласно API
    const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const isSupported = supportedFormats.includes(file.type);

    if (!isSupported) {
      message.error(`Формат ${file.type} не поддерживается. Загружайте только JPEG, PNG или WebP`);
      return false;
    }

    const isLt100M = file.size / 1024 / 1024 < 100;
    if (!isLt100M) {
      message.error('Размер файла не должен превышать 100MB');
      return false;
    }

    return true;
  };

  const handleSubmit = async (publish: boolean) => {
    try {
      setSubmitting(true);
      await form.validateFields();

      // Получаем данные формы
      const formData = form.getFieldsValue();

      // Создаем requirement JSON с характеристиками объекта
      const requirementData = {
        city: formData.city,
        address: formData.address,
        price: formData.price,
        area: formData.area,
        floor: formData.floor,
        floorsTotal: formData.floorsTotal,
        rooms: formData.rooms,
        propertyType: formData.propertyType,
        dealType: formData.dealType,
        buildingType: formData.buildingType,
        photos: fileList
          .filter((f) => f.status === 'done' && f.response?.base64)
          .map((f) => f.response.base64),
      };

      // Кодируем requirement в base64
      const requirementJson = JSON.stringify(requirementData);
      const requirementBase64 = btoa(unescape(encodeURIComponent(requirementJson)));

      // Получаем контактные данные пользователя
      const userEmail = localStorage.getItem('userEmail') || 'user@example.com';
      const contactName = `${localStorage.getItem('userFirstName') || 'Пользователь'} ${localStorage.getItem('userLastName') || ''}`.trim();
      const contactPhone = localStorage.getItem('userPhone') || '+7 (999) 123-45-67';

      // Создаем объект для API
      const leadData: CreateLeadRequest = {
        title: formData.title,
        description: formData.description,
        requirement: requirementBase64,
        contactName,
        contactPhone,
        contactEmail: userEmail,
      };


      // Отправляем запрос на создание лида
      await leadsAPI.createLead(leadData);

      // Определяем статус лида
      const statusMessage = publish
        ? 'Объект сохранён и отправлен на публикацию'
        : 'Черновик объекта сохранён';

      message.success(statusMessage);

      // Перенаправляем обратно на список объектов
      navigate('/my-objects');
    } catch (error) {

      if (
        error &&
        typeof error === 'object' &&
        'errorFields' in error &&
        Array.isArray((error as { errorFields?: unknown }).errorFields)
      ) {
        message.error('Проверьте заполнение обязательных полей');
      } else {
        const axiosError = error as { response?: { data?: { message?: string } } };
        const errorMessage = axiosError.response?.data?.message || 'Не удалось сохранить объект';
        message.error(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <Typography.Title level={2} className={styles.pageTitle}>
          Новый объект
        </Typography.Title>
      </header>

      <div className={styles.content}>
        <div className={styles.card}>
          <Form<FormValues>
            layout="vertical"
            form={form}
            initialValues={INITIAL_VALUES}
            onValuesChange={() => {
              /* allows Form.useWatch to update */
            }}
          >
            {/* Основная информация */}
            <div className={styles.section}>
              <Typography.Title level={4} className={styles.sectionTitle}>
                Основная информация
              </Typography.Title>
              <Form.Item label="Заголовок" name="title" rules={[{ required: true, message: 'Введите заголовок' }, { min: 3, message: 'Заголовок должен содержать не менее 3 символов' }]}>
                <Input placeholder="Например, квартира с видом на парк" size="large" />
              </Form.Item>

              <div className={styles.fieldRow}>
                <Form.Item label="Город" name="city" rules={[{ required: true, message: 'Укажите город' }]}>
                  <Input placeholder="Москва" size="large" />
                </Form.Item>
                <Form.Item label="Адрес" name="address" rules={[{ required: true, message: 'Укажите адрес' }]}>
                  <Input placeholder="ул. Ленина, д. 45, кв. 112" size="large" />
                </Form.Item>
              </div>
            </div>

            {/* Параметры объекта */}
            <div className={`${styles.section} ${styles.borderedGroup}`}>
              <Typography.Title level={4} className={styles.sectionTitle}>
                Параметры объекта
              </Typography.Title>

              <div className={styles.fieldRow}>
                <Form.Item label="Площадь, м²" name="area" rules={[{ required: true, message: 'Введите площадь' }]}>
                  <InputNumber min={1} step={0.1} className={styles.fullWidth} placeholder="65.5" size="large" />
                </Form.Item>
                <Form.Item label="Этаж" name="floor" rules={[{ required: true, message: 'Укажите этаж' }]}>
                  <InputNumber min={1} className={styles.fullWidth} placeholder="7" size="large" />
                </Form.Item>
                <Form.Item
                  label="Этажность"
                  name="floorsTotal"
                  rules={[{ required: true, message: 'Укажите общее количество этажей' }]}
                >
                  <InputNumber min={1} className={styles.fullWidth} placeholder="16" size="large" />
                </Form.Item>
                <Form.Item label="Комнаты" name="rooms" rules={[{ required: true, message: 'Укажите количество комнат' }]}>
                  <InputNumber min={1} className={styles.fullWidth} placeholder="2" size="large" />
                </Form.Item>
              </div>

              <div className={styles.fieldRow}>
                <Form.Item label="Тип объекта" name="propertyType" rules={[{ required: true, message: 'Выберите тип объекта' }]}>
                  <Select
                    size="large"
                    options={PROPERTY_TYPE_OPTIONS}
                    placeholder="Выберите тип"
                  />
                </Form.Item>
                <Form.Item label="Тип сделки" name="dealType" rules={[{ required: true, message: 'Выберите тип сделки' }]}>
                  <Select
                    size="large"
                    options={[
                      { value: 'sale', label: 'Продажа' },
                      { value: 'rent', label: 'Аренда' },
                    ]}
                    placeholder="Выберите тип"
                  />
                </Form.Item>
              </div>

              <Form.Item label="Цена, ₽" name="price" rules={[{ required: true, message: 'Укажите цену' }]}>
                <InputNumber
                  min={0}
                  className={styles.fullWidth}
                  formatter={(value) => (value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '')}
                  placeholder="15 500 000"
                  size="large"
                />
              </Form.Item>
            </div>

            {/* Фотографии и описание */}
            <div className={`${styles.section} ${styles.borderedGroup}`}>
              <Typography.Title level={4} className={styles.sectionTitle}>
                Фотографии и описание
              </Typography.Title>

              <Form.Item label="Фотографии">
                <Upload.Dragger
                  multiple
                  fileList={fileList}
                  beforeUpload={beforeUpload}
                  onChange={handleUploadChange}
                  customRequest={({ onSuccess }) => {
                    // Помечаем как uploading, реальная загрузка происходит в handleUploadChange
                    setTimeout(() => {
                      onSuccess?.('ok');
                    }, 0);
                  }}
                  listType="picture"
                  className={styles.upload}
                  disabled={uploading}
                >
                  <p className="ant-upload-drag-icon">
                    <PictureOutlined />
                  </p>
                  <p className="ant-upload-text">
                    {uploading ? 'Загрузка...' : 'Перетащите файлы сюда'}
                  </p>
                  <p className="ant-upload-hint">или нажмите, чтобы выбрать. JPEG, PNG, WebP до 100MB</p>
                </Upload.Dragger>
              </Form.Item>

              <ImageGallery fileList={fileList} />

              <Form.Item
                label="Описание"
                name="description"
                rules={[{ required: true, message: 'Добавьте описание объекта' }]}
              >
                <Input.TextArea rows={5} placeholder="Расскажите об особенностях объекта" />
              </Form.Item>
            </div>

            {/* Дополнительно */}
            <div className={`${styles.section} ${styles.borderedGroup}`}>
              <Typography.Title level={4} className={styles.sectionTitle}>
                Дополнительно
              </Typography.Title>

              <Form.Item label="Тип дома">
                <Form.Item name="buildingType" noStyle>
                  <Input className={styles.hiddenInput} />
                </Form.Item>
                <div className={styles.radioGroup}>
                  {(
                    [
                      { value: 'new', label: 'Новостройка' },
                      { value: 'secondary', label: 'Вторичка' },
                    ] as const
                  ).map((option) => {
                    const active = currentValues.buildingType === option.value;
                    return (
                      <span
                        key={option.value}
                        className={styles.radioOption}
                        role="radio"
                        aria-checked={active}
                        tabIndex={0}
                        onClick={() => form.setFieldsValue({ buildingType: option.value })}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            form.setFieldsValue({ buildingType: option.value });
                          }
                        }}
                      >
                        <span className={`${styles.radioBullet} ${active ? styles.radioBulletActive : ''}`}>
                          {active && <span className={styles.radioBulletInner} />}
                        </span>
                        {option.label}
                      </span>
                    );
                  })}
                </div>
              </Form.Item>
            </div>
          </Form>

          {/* Footer с кнопками */}
          <div className={styles.footer}>
            <Button
              type="default"
              className={styles.secondaryButton}
              icon={<SaveOutlined />}
              loading={submitting}
              onClick={() => handleSubmit(false)}
              size="large"
            >
              Сохранить
            </Button>
            <Button
              type="primary"
              className={styles.primaryButton}
              icon={submitting ? <LoadingOutlined /> : <DollarOutlined />}
              loading={submitting}
              onClick={() => handleSubmit(true)}
              size="large"
            >
              Сохранить и опубликовать
            </Button>
          </div>
        </div>

        {/* Preview Card */}
        <Card className={`${styles.card} ${styles.previewCard}`} styles={{ body: { padding: 0 } }}>
          <div className={styles.previewMedia}>
            {previewImage ? (
              <img src={previewImage} alt="Предпросмотр объекта" className={styles.previewCover} />
            ) : (
              <div className={styles.previewSkeleton}>
                <div className={styles.previewSkeletonIcon}>
                  <PictureOutlined />
                </div>
                <div className={styles.previewSkeletonText}>Фото не загружено</div>
              </div>
            )}
          </div>
          <div className={styles.previewBody}>
            <div className={styles.previewInfo}>
              <Typography.Title level={4} className={styles.previewPrice}>
                {formatPrice(currentValues.price)} ₽
              </Typography.Title>
              <Typography.Text strong>{currentValues.title}</Typography.Text>
              <Typography.Text type="secondary">
                {currentValues.city}, {currentValues.address}
              </Typography.Text>
            </div>
            <div className={styles.previewStats}>
              <span className={styles.previewStat}>
                <HomeOutlined />
                {currentValues.rooms} комн.
              </span>
              <span className={styles.previewStat}>
                <BarChartOutlined />
                {currentValues.floor}/{currentValues.floorsTotal} эт.
              </span>
              <span className={styles.previewStat}>
                <ApartmentOutlined />
                {currentValues.area} м²
              </span>
            </div>
            <Typography.Paragraph className={styles.previewDescription} ellipsis={{ rows: 3 }}>
              {currentValues.description}
            </Typography.Paragraph>
            <Space direction="vertical" size={8}>
              <Space size={6}>
                <HomeOutlined className={styles.previewIcon} />
                <Typography.Text type="secondary">
                  {currentValues.buildingType === 'new' ? 'Новостройка' : 'Втор��чка'}
                </Typography.Text>
              </Space>
            </Space>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default NewObjectPage;

function fileToBase64(file: RcFile): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Удаляем префикс и декодируем base64
      const base64 = reader.result?.toString().split(',')[1];
      resolve(base64 || '');
    };
    reader.onerror = (error) => {
      reject(error);
    };
  });
}
