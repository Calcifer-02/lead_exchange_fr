import { useState, useMemo } from 'react';
import {
  ArrowLeftOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  SaveOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import {
  Button,
  Form,
  Input,
  Typography,
  message,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { leadsAPI } from '../../api';
import type { CreateLeadRequest } from '../../types';
import styles from './styles.module.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface FormValues {
  title: string;
  description: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}

const INITIAL_VALUES: FormValues = {
  title: '',
  description: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
};

const NewLeadPage = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);

  const values = Form.useWatch([], form) as FormValues | undefined;
  const currentValues = values ?? INITIAL_VALUES;

  // Получаем данные пользователя из localStorage
  const userEmail = localStorage.getItem('userEmail') || '';
  const userFirstName = localStorage.getItem('userFirstName') || '';
  const userLastName = localStorage.getItem('userLastName') || '';
  const userPhone = localStorage.getItem('userPhone') || '';

  // Устанавливаем начальные значения из профиля
  useMemo(() => {
    if (userEmail && !form.getFieldValue('contactEmail')) {
      form.setFieldsValue({
        contactEmail: userEmail,
        contactName: `${userFirstName} ${userLastName}`.trim() || undefined,
        contactPhone: userPhone || undefined,
      });
    }
  }, [form, userEmail, userFirstName, userLastName, userPhone]);

  const handleSubmit = async () => {
    try {
      const formValues = await form.validateFields();
      setSubmitting(true);

      // Requirement будет заполнен через ML анализ описания
      // Пока отправляем пустой объект, закодированный в base64
      const requirement = {
        extractedFromDescription: true,
        rawDescription: formValues.description,
      };

      // Кодируем requirement в base64
      const requirementJson = JSON.stringify(requirement);
      const requirementBase64 = btoa(unescape(encodeURIComponent(requirementJson)));

      const leadData: CreateLeadRequest = {
        title: formValues.title,
        description: formValues.description,
        requirement: requirementBase64,
        contactName: formValues.contactName,
        contactPhone: formValues.contactPhone,
        contactEmail: formValues.contactEmail,
      };

      await leadsAPI.createLead(leadData);

      message.success('Лид успешно создан и отправлен на модерацию!');
      navigate('/my-objects');
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message || 'Не удалось создать лид');
      } else {
        message.error('Не удалось создать лид');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };


  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.pageHeader}>
        <div
          className={styles.backButton}
          onClick={() => navigate(-1)}
          role="button"
          tabIndex={0}
        >
          <ArrowLeftOutlined />
          <span>Назад</span>
        </div>
        <Title level={2} style={{ margin: 0 }}>
          Новый лид
        </Title>
      </header>

      {/* Content */}
      <div className={styles.content}>
        {/* Form */}
        <Form
          form={form}
          layout="vertical"
          initialValues={INITIAL_VALUES}
          requiredMark={false}
        >
          <div className={styles.card}>
            {/* Основная информация */}
            <section className={styles.section}>
              <Title level={4} className={styles.sectionTitle}>
                <FileTextOutlined className={styles.sectionIcon} />
                Информация о лиде
              </Title>

              <Form.Item
                name="title"
                label="Название лида"
                rules={[{ required: true, message: 'Введите название' }]}
              >
                <Input
                  placeholder="Например: Ищу 2-комнатную квартиру в центре"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="description"
                label="Описание запроса"
                rules={[{ required: true, message: 'Введите описание' }]}
                extra="Опишите подробно требования клиента. Наш умный матчинг автоматически извлечёт параметры: цену, площадь, количество комнат, район и другие характеристики."
              >
                <TextArea
                  placeholder="Например: Ищу двухкомнатную квартиру в Москве, район метро Маяковская или Тверская. Бюджет до 15 млн рублей. Площадь от 50 до 70 кв.м. Желательно не первый и не последний этаж. Нужна парковка. Ремонт евро или дизайнерский. Срочно, готов к просмотрам на этой неделе."
                  rows={8}
                  showCount
                  maxLength={2000}
                />
              </Form.Item>
            </section>

            {/* Контактная информация */}
            <section className={`${styles.section} ${styles.borderedGroup}`}>
              <Title level={4} className={styles.sectionTitle}>
                <UserOutlined className={styles.sectionIcon} />
                Контактная информация
              </Title>

              <div className={styles.fieldRow}>
                <Form.Item
                  name="contactName"
                  label="Имя контакта"
                  rules={[{ required: true, message: 'Введите имя' }]}
                >
                  <Input
                    prefix={<UserOutlined style={{ color: '#6b778c' }} />}
                    placeholder="Иван Иванов"
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  name="contactPhone"
                  label="Телефон"
                  rules={[{ required: true, message: 'Введите телефон' }]}
                >
                  <Input
                    prefix={<PhoneOutlined style={{ color: '#6b778c' }} />}
                    placeholder="+7 (999) 199-45-67"
                    size="large"
                  />
                </Form.Item>
              </div>

              <Form.Item
                name="contactEmail"
                label="Email"
                rules={[
                  { required: true, message: 'Введите email' },
                  {
                    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Некорректный email'
                  },
                ]}
              >
                <Input
                  prefix={<MailOutlined style={{ color: '#6b778c' }} />}
                  placeholder="example@mail.ru"
                  size="large"
                />
              </Form.Item>
            </section>


            {/* Footer */}
            <div className={styles.footer}>
              <Button
                size="large"
                className={styles.secondaryButton}
                onClick={handleCancel}
              >
                Отмена
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<SaveOutlined />}
                className={styles.primaryButton}
                loading={submitting}
                onClick={handleSubmit}
              >
                Создать лид
              </Button>
            </div>
          </div>
        </Form>

        {/* Preview Card */}
        <div className={`${styles.card} ${styles.previewCard}`}>
          <div className={styles.previewHeader}>
            <Title level={4} className={styles.previewHeaderTitle}>
              Предпросмотр лида
            </Title>
            <Text className={styles.previewHeaderSubtitle}>
              Так будет выглядеть ваш лид
            </Text>
          </div>

          <div className={styles.previewBody}>
            {/* Название */}
            <div className={styles.previewSection}>
              <span className={styles.previewLabel}>Название</span>
              <span className={styles.previewValue}>
                {currentValues.title || 'Не указано'}
              </span>
            </div>

            {/* Описание */}
            {currentValues.description && (
              <div className={styles.previewSection}>
                <span className={styles.previewLabel}>Описание</span>
                <span className={styles.previewValue}>
                  {currentValues.description}
                </span>
              </div>
            )}

            {/* Контакт */}
            {(currentValues.contactName ||
              currentValues.contactPhone ||
              currentValues.contactEmail) && (
              <div className={styles.previewContact}>
                {currentValues.contactName && (
                  <div className={styles.previewContactItem}>
                    <UserOutlined className={styles.previewContactIcon} />
                    <span>{currentValues.contactName}</span>
                  </div>
                )}
                {currentValues.contactPhone && (
                  <div className={styles.previewContactItem}>
                    <PhoneOutlined className={styles.previewContactIcon} />
                    <span>{currentValues.contactPhone}</span>
                  </div>
                )}
                {currentValues.contactEmail && (
                  <div className={styles.previewContactItem}>
                    <MailOutlined className={styles.previewContactIcon} />
                    <span>{currentValues.contactEmail}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewLeadPage;

