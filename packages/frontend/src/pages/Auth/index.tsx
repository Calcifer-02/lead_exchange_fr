import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Checkbox, message } from 'antd';
import { UserOutlined, LockOutlined, PhoneOutlined, HomeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../api';
import type { LoginRequest, RegisterRequest } from '../../types';
import styles from './styles.module.css';

type TabType = 'login' | 'register';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('login');
  const [loading, setLoading] = useState(false);
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [loginCheckboxError, setLoginCheckboxError] = useState(false);
  const [registerCheckboxError, setRegisterCheckboxError] = useState(false);

  // Проверяем, есть ли токен при загрузке страницы
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  // Функция для декодирования JWT токена
  const decodeJWT = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to decode JWT:', error);
      return null;
    }
  };

  const formatPhoneNumber = (value: string) => {
    if (!value) return value;

    // Удаляем все нецифровые символы
    const phoneNumber = value.replace(/[^\d]/g, '');

    // Ограничиваем 11 цифрами
    const limitedNumber = phoneNumber.slice(0, 11);

    // Форматируем номер
    if (limitedNumber.length === 0) return '';
    if (limitedNumber.length === 1) return `+7`;
    if (limitedNumber.length <= 4) return `+7 (${limitedNumber.slice(1)}`;
    if (limitedNumber.length <= 7) return `+7 (${limitedNumber.slice(1, 4)}) ${limitedNumber.slice(4)}`;
    if (limitedNumber.length <= 9) return `+7 (${limitedNumber.slice(1, 4)}) ${limitedNumber.slice(4, 7)}-${limitedNumber.slice(7)}`;
    return `+7 (${limitedNumber.slice(1, 4)}) ${limitedNumber.slice(4, 7)}-${limitedNumber.slice(7, 9)}-${limitedNumber.slice(9, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    registerForm.setFieldsValue({ phone: formatted });
  };

  const validatePhone = (_: unknown, value: string) => {
    if (!value) {
      return Promise.reject(new Error('Введите телефон'));
    }
    const digits = value.replace(/[^\d]/g, '');
    if (digits.length !== 11) {
      return Promise.reject(new Error('Телефон должен содержать 11 цифр'));
    }
    if (!digits.startsWith('7')) {
      return Promise.reject(new Error('Телефон должен начинаться с +7'));
    }
    return Promise.resolve();
  };

  const handleLogin = async (values: LoginRequest & { agreeToTerms: boolean }) => {
    if (!values.agreeToTerms) {
      message.error('Необходимо согласиться с правилами сервиса');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.login({
        email: values.email,
        password: values.password,
      });

      // Декодируем JWT токен для получения userId
      const decodedToken = decodeJWT(response.token);
      const userId = decodedToken?.uid;

      if (!userId) {
        console.error('Failed to extract userId from token');
        message.error('Ошибка авторизации: не удалось получить ID пользователя');
        return;
      }

      // Сохраняем токен, email и userId пользователя
      localStorage.setItem('token', response.token);
      localStorage.setItem('userEmail', values.email);
      localStorage.setItem('userId', userId);

      message.success(`Добро пожаловать, ${values.email}!`);
      console.log('Успешная авторизация. Token:', response.token, 'UserId:', userId);

      navigate('/dashboard');
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const errorMessage = axiosError.response?.data?.message || 'Ошибка авторизации';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: RegisterRequest & { agreeToTerms: boolean }) => {
    if (!values.agreeToTerms) {
      message.error('Необходимо согласиться с правилами сервиса');
      return;
    }

    setLoading(true);
    try {
      // Убираем форматирование из телефона, оставляем только цифры
      const phoneDigits = values.phone.replace(/[^\d]/g, '');

      const registerData = {
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: phoneDigits, // Отправляем только цифры
        agencyName: values.agencyName,
      };

      console.log('Отправляем данные регистрации:', registerData);

      await authAPI.register(registerData);
      message.success('Регистрация успешна! Теперь вы можете войти.');

      // Сохраняем данные профиля для будущего использования
      localStorage.setItem('userFirstName', values.firstName);
      localStorage.setItem('userLastName', values.lastName);
      localStorage.setItem('userPhone', phoneDigits);

      // Переносим email и пароль в форму входа
      loginForm.setFieldsValue({
        email: values.email,
        password: values.password,
      });

      setActiveTab('login');
      registerForm.resetFields();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: Record<string, unknown> } };
      console.error('Ошибка регистрации:', axiosError);

      let errorMessage = 'Ошибка регистрации';

      if (axiosError.response?.data) {
        const data = axiosError.response.data;
        errorMessage = (data.message as string) || (data.error as string) || JSON.stringify(data);
      }

      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderLoginForm = () => (
    <Form
      form={loginForm}
      name="login"
      onFinish={handleLogin}
      autoComplete="off"
      layout="vertical"
      className={styles.authForm}
    >
      <Form.Item
        name="email"
        rules={[
          { required: true, message: 'Введите email' },
          {
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]{1,}$/,
            message: 'Введите корректный email'
          },
        ]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder="Email"
          size="large"
          autoComplete="email"
        />
      </Form.Item>

      <Form.Item
        name="password"
        rules={[{ required: true, message: 'Введите пароль' }]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="Пароль"
          size="large"
          autoComplete="current-password"
        />
      </Form.Item>

      <div className={styles.termsRow}>
        <Form.Item
          name="agreeToTerms"
          valuePropName="checked"
          initialValue={true}
          rules={[
            {
              validator: (_, value) => {
                if (value) {
                  setLoginCheckboxError(false);
                  return Promise.resolve();
                }
                setLoginCheckboxError(true);
                return Promise.reject(new Error('Необходимо согласие'));
              },
            },
          ]}
        >
          <Checkbox style={{ color: loginCheckboxError ? '#ff4d4f' : 'inherit' }}>
            Согласен с правилами сервиса
          </Checkbox>
        </Form.Item>

        <div className={styles.forgotPassword}>
          <a href="#">Забыли пароль?</a>
        </div>
      </div>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          block
          loading={loading}
          className={styles.authButton}
        >
          Войти
        </Button>
      </Form.Item>
    </Form>
  );

  const renderRegisterForm = () => (
    <Form
      form={registerForm}
      name="register"
      onFinish={handleRegister}
      autoComplete="off"
      layout="vertical"
      className={styles.authForm}
    >
      <Form.Item
        name="email"
        rules={[
          { required: true, message: 'Введите email' },
          {
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Введите корректный email'
          },
        ]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder="Email"
          size="large"
          autoComplete="email"
        />
      </Form.Item>

      <Form.Item
        name="password"
        rules={[
          { required: true, message: 'Введите пароль' },
          { min: 6, message: 'Минимум 6 символов' },
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="Пароль"
          size="large"
          autoComplete="new-password"
        />
      </Form.Item>

      <Form.Item
        name="firstName"
        rules={[{ required: true, message: 'Введите имя' }]}
      >
        <Input placeholder="Имя" size="large" autoComplete="given-name" />
      </Form.Item>

      <Form.Item
        name="lastName"
        rules={[{ required: true, message: 'Введите фамилию' }]}
      >
        <Input placeholder="Фамилия" size="large" autoComplete="family-name" />
      </Form.Item>

      <Form.Item
        name="phone"
        rules={[{ validator: validatePhone }]}
      >
        <Input
          prefix={<PhoneOutlined />}
          placeholder="+7 (XXX) XXX-XX-XX"
          size="large"
          onChange={handlePhoneChange}
          maxLength={18}
          autoComplete="tel"
        />
      </Form.Item>

      <Form.Item
        name="agencyName"
        rules={[{ required: true, message: 'Введите название агентства' }]}
      >
        <Input
          prefix={<HomeOutlined />}
          placeholder="Название агентства"
          size="large"
          autoComplete="organization"
        />
      </Form.Item>

      <div className={styles.termsRow}>
        <Form.Item
          name="agreeToTerms"
          valuePropName="checked"
          initialValue={true}
          rules={[
            {
              validator: (_, value) => {
                if (value) {
                  setRegisterCheckboxError(false);
                  return Promise.resolve();
                }
                setRegisterCheckboxError(true);
                return Promise.reject(new Error('Необходимо согласие'));
              },
            },
          ]}
        >
          <Checkbox style={{ color: registerCheckboxError ? '#ff4d4f' : 'inherit' }}>
            Согласен с правилами сервиса
          </Checkbox>
        </Form.Item>

        <div className={styles.forgotPassword}>
          <a href="#">Забыли пароль?</a>
        </div>
      </div>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          block
          loading={loading}
          className={styles.authButton}
        >
          Создать аккаунт
        </Button>
      </Form.Item>
    </Form>
  );


  return (
    <div className={styles.authPage}>
      <header className={styles.header}>
        <img src="/logo.svg" alt="Lead Exchange" className={styles.logo} />
        <h1 className={styles.brandName}>Lead Exchange</h1>
      </header>

      <div className={styles.content}>
        <div className={styles.authContainer}>
          <div className={styles.authHeader}>
            <h1 className={styles.authTitle}>Добро пожаловать</h1>
            <p className={styles.authDescription}>Выберите способ входа в систему</p>
          </div>

          <div className={styles.tabSwitcher}>
            <div
              className={`${styles.tabIndicator} ${activeTab === 'register' ? styles.tabIndicatorRegister : ''}`}
            />
            <button
              className={`${styles.tabButton} ${activeTab === 'login' ? styles.tabButtonActive : ''}`}
              onClick={() => setActiveTab('login')}
            >
              Войти
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'register' ? styles.tabButtonActive : ''}`}
              onClick={() => setActiveTab('register')}
            >
              Создать аккаунт
            </button>
          </div>

          <div className={`${styles.tabContent} ${activeTab === 'login' ? styles.tabContentActive : ''}`}>
            {renderLoginForm()}
          </div>
          <div className={`${styles.tabContent} ${activeTab === 'register' ? styles.tabContentActive : ''}`}>
            {renderRegisterForm()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
