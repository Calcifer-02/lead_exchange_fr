import { useEffect, useMemo, useState } from 'react';
import {
  ApartmentOutlined,
  BarChartOutlined,
  DollarOutlined,
  HomeOutlined,
  LoadingOutlined,
  PictureOutlined,
  SaveOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { Button, Card, Form, Input, InputNumber, message, Select, Space, Typography, Upload } from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import type { RcFile } from 'antd/es/upload';
import { useNavigate } from 'react-router-dom';
import { fileAPI } from '../../api/file';
import styles from './styles.module.css';

type DealType = 'sale' | 'rent';
type BuildingType = 'new' | 'secondary';

interface FormValues {
  title: string;
  city: string;
  address: string;
  price: number;
  area: number;
  floor: number;
  floorsTotal: number;
  rooms: number;
  propertyType: string;
  dealType: DealType;
  description: string;
  tags: string[];
  buildingType: BuildingType;
}

const INITIAL_VALUES: FormValues = {
  title: 'Двухкомнатная квартира в ЖК «Горизонт»',
  city: 'Москва',
  address: 'ул. Ленина, д. 45, кв. 112',
  price: 15500000,
  area: 65.5,
  floor: 7,
  floorsTotal: 16,
  rooms: 2,
  propertyType: 'flat',
  dealType: 'sale',
  description:
    'Просторная двухкомнатная квартира с дизайнерским ремонтом в новом жилом комплексе «Горизонт». Панорамные окна, вид на парк. Развитая инфраструктура и закрытая территория.',
  tags: ['exclusive'],
  buildingType: 'new',
};

const TAG_OPTIONS = [
  { value: 'exclusive', label: 'Эксклюзив' },
  { value: 'urgent', label: 'Срочно' },
  { value: 'discount', label: 'Скидка' },
  { value: 'verified', label: 'Проверено' },
];

const PREVIEW_PLACEHOLDER = 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80';

const formatPrice = (value?: number) =>
  typeof value === 'number' ? new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0 }).format(value) : '—';

const NewObjectPage = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([
    {
      uid: '1',
      name: 'living-room.jpg',
      status: 'done',
      url: PREVIEW_PLACEHOLDER,
    },
    {
      uid: '2',
      name: 'kitchen.jpg',
      status: 'done',
      url: PREVIEW_PLACEHOLDER,
    },
  ]);

  const values = Form.useWatch([], form) as FormValues | undefined;
  const currentValues = values ?? INITIAL_VALUES;

  const previewImage = useMemo(
    () => fileList[0]?.url ?? fileList[0]?.thumbUrl ?? PREVIEW_PLACEHOLDER,
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
        console.log('Starting upload for:', file.name, 'Size:', file.size, 'Type:', file.type);
        const serverUrl = await fileAPI.uploadFile(file.originFileObj);
        console.log('Upload successful, Server URL:', serverUrl);

        // Обновляем fileList с blob URL для preview и сохраняем server URL в data
        const updatedFileList = newFileList.map((f) => {
          if (f.uid === file.uid) {
            return {
              ...f,
              status: 'done' as const,
              url: blobUrl, // Используем blob URL для отображения
              response: { serverUrl }, // Сохраняем настоящий URL для будущего использования
            };
          }
          return f;
        });

        setFileList(updatedFileList);
        message.success(`${file.name} успешно загружен`);
      } catch (error) {
        console.error('Upload error:', error);

        // Очищаем blob URL при ошибке
        URL.revokeObjectURL(blobUrl);

        // Извлекаем детальное сообщение об ошибке
        let errorMessage = `Не удалось загрузить ${file.name}`;
        if (error && typeof error === 'object') {
          const axiosError = error as { response?: { data?: { message?: string; error?: string } } };
          if (axiosError.response?.data?.message) {
            errorMessage += `: ${axiosError.response.data.message}`;
          } else if (axiosError.response?.data?.error) {
            errorMessage += `: ${axiosError.response.data.error}`;
          }
        }

        message.error(errorMessage);

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
    // Список поддерживаемых форматов согласно API
    const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const isSupported = supportedFormats.includes(file.type);

    if (!isSupported) {
      message.error(`Формат ${file.type} не поддерживается. Загружайте только JPEG, PNG или WebP`);
      return false;
    }

    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('Размер файла не должен превышать 10MB');
      return false;
    }

    return true;
  };

  const handleSubmit = async (publish: boolean) => {
    try {
      setSubmitting(true);
      await form.validateFields();
      // TODO: Отправить данные на сервер
      await new Promise((resolve) => setTimeout(resolve, 800));
      message.success(publish ? 'Объект сохранён и отправлен на публикацию' : 'Черновик объекта сохранён');
      
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
        message.error('Не удалось сохранить объект');
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
              <Form.Item label="Заголовок" name="title" rules={[{ required: true, message: 'Введите заголовок' }]}>
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
                <Form.Item
                  label="Тип объекта"
                  name="propertyType"
                  rules={[{ required: true, message: 'Выберите тип объекта' }]}
                >
                  <Select
                    size="large"
                    options={[
                      { value: 'flat', label: 'Квартира' },
                      { value: 'house', label: 'Дом' },
                      { value: 'apartment', label: 'Апартаменты' },
                      { value: 'commercial', label: 'Коммерческая недвижимость' },
                    ]}
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
                  <p className="ant-upload-hint">или нажмите, чтобы выбрать. JPEG, PNG, WebP до 10MB</p>
                </Upload.Dragger>
              </Form.Item>

              <div className={styles.galleryGrid}>
                {fileList.slice(0, 4).map((file) => (
                  <img key={file.uid} src={file.url ?? file.thumbUrl} alt={file.name} className={styles.galleryImage} />
                ))}
                {Array.from({ length: Math.max(0, 4 - fileList.length) }).map((_, index) => (
                  <div key={`placeholder-${index}`} className={styles.galleryPlaceholder} />
                ))}
              </div>

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

              <Form.Item label="Теги">
                <Form.Item name="tags" noStyle>
                  <Select mode="multiple" options={TAG_OPTIONS} className={styles.hiddenInput} />
                </Form.Item>
                <div className={styles.tagGroup}>
                  {TAG_OPTIONS.map((tag) => {
                    const active = currentValues.tags?.includes(tag.value);
                    return (
                      <span
                        key={tag.value}
                        className={`${styles.tagToggle} ${active ? styles.tagToggleActive : ''}`}
                        onClick={() => {
                          const next = new Set(currentValues.tags ?? []);
                          if (active) {
                            next.delete(tag.value);
                          } else {
                            next.add(tag.value);
                          }
                          form.setFieldsValue({ tags: Array.from(next) });
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            const next = new Set(currentValues.tags ?? []);
                            if (active) {
                              next.delete(tag.value);
                            } else {
                              next.add(tag.value);
                            }
                            form.setFieldsValue({ tags: Array.from(next) });
                          }
                        }}
                      >
                        {tag.label}
                      </span>
                    );
                  })}
                </div>
              </Form.Item>

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
            <img src={previewImage} alt="Предпросмотр объекта" className={styles.previewCover} />
          </div>
          <div className={styles.previewBody}>
            <Space size={8}>
              {currentValues.tags?.includes('exclusive') && <span className={styles.previewTag}>Эксклюзив</span>}
              {currentValues.tags?.includes('urgent') && (
                <span className={`${styles.previewTag} ${styles.previewTagUrgent}`}>
                  Срочно
                </span>
              )}
            </Space>
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
                <TagsOutlined className={styles.previewIcon} />
                <Typography.Text type="secondary">
                  {currentValues.tags?.length
                    ? currentValues.tags.map((tag) => TAG_OPTIONS.find((t) => t.value === tag)?.label ?? tag).join(', ')
                    : 'Без тегов'}
                </Typography.Text>
              </Space>
              <Space size={6}>
                <HomeOutlined className={styles.previewIcon} />
                <Typography.Text type="secondary">
                  {currentValues.buildingType === 'new' ? 'Новостройка' : 'Вторичка'}
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

