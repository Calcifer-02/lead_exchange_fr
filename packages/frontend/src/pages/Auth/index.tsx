import React, { useState } from 'react';
import { Form, Input, Button, Checkbox, message } from 'antd';
import { UserOutlined, LockOutlined, PhoneOutlined, HomeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../api/auth';
import type { LoginRequest, RegisterRequest } from '../../api/auth';
import styles from './styles.module.css';

type TabType = 'login' | 'register';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('login');
  const [loading, setLoading] = useState(false);
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [loginCheckboxError, setLoginCheckboxError] = useState(false);
  const [registerCheckboxError, setRegisterCheckboxError] = useState(false);

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

      // Сохраняем токен и email пользователя
      localStorage.setItem('token', response.token);
      localStorage.setItem('userEmail', values.email);

      message.success(`Добро пожаловать, ${values.email}!`);
      console.log('Успешная авторизация. Token:', response.token);

      // Редирект на страницу дашборда
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const errorMessage = apiError.response?.data?.message || 'Ошибка авторизации';
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

      // Переносим email и пароль в форму входа
      loginForm.setFieldsValue({
        email: values.email,
        password: values.password,
      });

      setActiveTab('login');
      registerForm.resetFields();
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error('Ошибка регистрации:', apiError);

      let errorMessage = 'Ошибка регистрации';

      if (apiError.response?.data) {
        const data = apiError.response.data as Record<string, unknown>;
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
          { type: 'email', message: 'Введите корректный email' },
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
          { type: 'email', message: 'Введите корректный email' },
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

