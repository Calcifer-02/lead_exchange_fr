import React, { useState, useEffect, useMemo } from 'react';
import { Card, Tabs, Empty, List, Button, Tag, Space, Spin, Alert, message, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { DollarOutlined } from '@ant-design/icons';
import { dealsAPI, paymentAPI } from '../../api';
import { useLeads } from '../../hooks/useLeads';
import type { Deal, DealStatus } from '../../types';
import styles from './styles.module.css';

const { Text } = Typography;

const STATUS_LABELS: Record<DealStatus, string> = {
  DEAL_STATUS_UNSPECIFIED: 'Не задан',
  DEAL_STATUS_PENDING: 'Ожидает',
  DEAL_STATUS_ACCEPTED: 'Принята',
  DEAL_STATUS_COMPLETED: 'Завершена',
  DEAL_STATUS_CANCELLED: 'Отменена',
  DEAL_STATUS_REJECTED: 'Отклонена',
};

const STATUS_COLORS: Record<DealStatus, string> = {
  DEAL_STATUS_UNSPECIFIED: 'default',
  DEAL_STATUS_PENDING: 'orange',
  DEAL_STATUS_ACCEPTED: 'blue',
  DEAL_STATUS_COMPLETED: 'green',
  DEAL_STATUS_CANCELLED: 'red',
  DEAL_STATUS_REJECTED: 'red',
};

const DealsPage: React.FC = () => {
  const navigate = useNavigate();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);
  const [completingDeal, setCompletingDeal] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState<string | null>(null); // ID сделки, для которой проверяется платёж
  // Получаем уникальные ID лидов из сделок
  const leadIds = useMemo(() => {
    return Array.from(new Set(deals.map(deal => deal.leadId)));
  }, [deals]);

  // Используем хук для получения данных лидов
  const { leads: leadsData, loading: leadsLoading } = useLeads(leadIds);

  useEffect(() => {
    const loadDeals = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await dealsAPI.fetchDeals();
        setDeals(response);
      } catch  {
        message.error('Не удалось загрузить список сделок');
      } finally {
        setLoading(false);
      }
    };

    loadDeals();
  }, []);

  useEffect(() => {
    setCurrentUserId(localStorage.getItem('userId'));
  }, []);

  // Проверка статуса платежа после возврата с ЮKassa (с polling)
  useEffect(() => {
    let pollCount = 0;
    const maxPolls = 10; // Максимум 10 попыток
    const pollInterval = 3000; // 3 секунды между попытками
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const checkPendingPayment = async (): Promise<boolean> => {
      const pendingPaymentStr = localStorage.getItem('pendingPayment');
      if (!pendingPaymentStr) return true; // Завершаем polling

      try {
        const pendingPayment = JSON.parse(pendingPaymentStr);
        const { paymentId, dealId, timestamp } = pendingPayment;

        // Проверяем, что платеж не старше 1 часа
        if (Date.now() - timestamp > 3600000) {
          localStorage.removeItem('pendingPayment');
          return true;
        }

        // Проверяем статус платежа
        const payment = await paymentAPI.getPaymentStatus(paymentId);

        if (payment.status === 'succeeded' && payment.paid) {
          // Платеж успешен - завершаем сделку
          try {
            const completedDeal = await dealsAPI.completeDeal(dealId);

            message.destroy();
            message.success('Оплата прошла успешно! Теперь вам доступны контакты лида.');

            // Обновляем локальное состояние
            setDeals(prevDeals =>
              prevDeals.map(d =>
                d.dealId === dealId ? completedDeal : d
              )
            );
            localStorage.removeItem('pendingPayment');
            return true; // Завершаем polling
          } catch (completionError) {
            console.error('Error completing deal:', completionError);
            message.destroy();
            message.warning('Оплата прошла, но не удалось завершить сделку автоматически. Нажмите "Проверить оплату".');
            localStorage.removeItem('pendingPayment');
            return true;
          }
        } else if (payment.status === 'canceled') {
          message.destroy();
          message.error('Платеж был отменён');
          localStorage.removeItem('pendingPayment');
          return true;
        } else if (payment.status === 'pending') {
          // Платёж ещё обрабатывается - продолжаем polling
          return false;
        }
        return true;
      } catch (err) {
        console.error('Error checking payment status:', err);
        return false; // Продолжаем попытки при ошибке сети
      }
    };

    const startPolling = async () => {
      const pendingPaymentStr = localStorage.getItem('pendingPayment');
      if (!pendingPaymentStr) return;

      setCompletingDeal(true);
      message.loading('Проверка статуса оплаты...', 0);

      const poll = async () => {
        pollCount++;
        const shouldStop = await checkPendingPayment();

        if (shouldStop || pollCount >= maxPolls) {
          message.destroy();
          setCompletingDeal(false);
          if (pollCount >= maxPolls && !shouldStop) {
            message.info('Платёж обрабатывается. Нажмите "Проверить оплату" позже.');
          }
        } else {
          // Продолжаем polling
          timeoutId = setTimeout(poll, pollInterval);
        }
      };

      poll();
    };

    // Запускаем проверку только после загрузки сделок и получения userId
    if (!loading && currentUserId) {
      startPolling();
    }

    // Очистка при размонтировании
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [loading, currentUserId]);

  const filterMyDeals = (dealsList: Deal[]): Deal[] => {
    if (!currentUserId) return [];

    const myDeals = dealsList.filter(deal =>
      deal.sellerUserId === currentUserId ||
      deal.buyerUserId === currentUserId
    );



    return myDeals;
  };

  // Функция для ручной проверки статуса платежа
  const handleCheckPaymentStatus = async (dealId: string) => {
    // Ищем платёж в localStorage
    const pendingPaymentStr = localStorage.getItem('pendingPayment');
    if (!pendingPaymentStr) {
      message.info('Нет информации о платеже. Попробуйте оплатить снова.');
      return;
    }

    try {
      const pendingPayment = JSON.parse(pendingPaymentStr);
      if (pendingPayment.dealId !== dealId) {
        message.info('Платёж относится к другой сделке.');
        return;
      }

      setCheckingPayment(dealId);
      const payment = await paymentAPI.getPaymentStatus(pendingPayment.paymentId);

      if (payment.status === 'succeeded' && payment.paid) {
        // Завершаем сделку
        try {
          const completedDeal = await dealsAPI.completeDeal(dealId);
          message.success('Оплата подтверждена! Контакты лида теперь вам доступны.');
          setDeals(prevDeals =>
            prevDeals.map(d => d.dealId === dealId ? completedDeal : d)
          );
          localStorage.removeItem('pendingPayment');
        } catch {
          message.error('Не удалось завершить сделку.');
        }
      } else if (payment.status === 'pending') {
        message.info('Платёж ещё обрабатывается. Попробуйте через несколько секунд.');
      } else if (payment.status === 'canceled') {
        message.error('Платёж был отменён.');
        localStorage.removeItem('pendingPayment');
      } else {
        message.info(`Статус платежа: ${payment.status}`);
      }
    } catch (err) {
      console.error('Error checking payment:', err);
      message.error('Не удалось проверить статус платежа.');
    } finally {
      setCheckingPayment(null);
    }
  };

  // Функция для получения заголовка лида
  const getLeadTitle = (leadId: string): string => {
    const lead = leadsData[leadId];
    return lead?.title || `Лид ${leadId.slice(0, 8)}...`;
  };

  const getUserInfo = (userId: string): string => {
    return `${userId.slice(0, 8)}...`;
  };

  const handleUpdateDeal = async (dealId: string, updates: { status?: DealStatus; price?: number }) => {
    try {
      await dealsAPI.updateDeal(dealId, updates);
      message.success('Сделка обновлена');

      setDeals(prevDeals =>
        prevDeals.map(deal =>
          deal.dealId === dealId
            ? { ...deal, ...updates, updatedAt: new Date().toISOString() }
            : deal
        )
      );
    } catch {
      message.error('Не удалось обновить сделку');
    }
  };

  const handleAcceptDeal = async (dealId: string) => {
    try {
      const updatedDeal = await dealsAPI.acceptDeal(dealId);
      message.success('Сделка принята');

      setDeals(prevDeals =>
        prevDeals.map(deal =>
          deal.dealId === dealId ? updatedDeal : deal
        )
      );
    } catch {
      message.error('Не удалось принять сделку');
    }
  };

  const handlePayForDeal = async (deal: Deal) => {
    if (!currentUserId) {
      message.error('Необходимо авторизоваться');
      return;
    }

    try {
      setPaymentLoading(deal.dealId);
      message.loading('Создание платежа...', 0);

      // Получаем полный ответ с paymentId
      const paymentData = {
        value: deal.price.toFixed(2),
        orderId: deal.dealId,
        userId: currentUserId,
        returnUrl: `${window.location.origin}/deals`, // Возврат на страницу сделок
      };

      const response = await paymentAPI.createPayment(paymentData);
      const paymentId = response.payment.id;
      const paymentUrl = response.payment.confirmation!.confirmation_url;

      // Сохраняем данные платежа для проверки после возврата
      localStorage.setItem('pendingPayment', JSON.stringify({
        paymentId,
        dealId: deal.dealId,
        timestamp: Date.now()
      }));

      message.destroy();
      message.success('Перенаправление на страницу оплаты...');

      // Перенаправляем пользователя на страницу оплаты ЮKassa
      window.location.href = paymentUrl;
    } catch {
      message.destroy();
      message.error('Не удалось создать платеж. Попробуйте позже.');
    } finally {
      setPaymentLoading(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
  };

  const formatDate = (dateString: string) => {
    if (dateString === '0001-01-01T00:00:00Z') {
      return 'Дата не установлена';
    }

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Неверная дата';
    }
  };

  const renderDealItem = (deal: Deal) => {
    const isSeller = deal.sellerUserId === currentUserId;
    const isBuyer = deal.buyerUserId === currentUserId;

    return (
      <List.Item
        key={deal.dealId}
        className={styles.dealItem}
        actions={[
          // ПОКУПАТЕЛЬ может принять сделку (стать покупателем)
          // Показываем кнопку если пользователь НЕ продавец и у сделки ещё нет покупателя
          !isSeller && deal.status === 'DEAL_STATUS_PENDING' && !deal.buyerUserId && (
            <Button type="primary" className={styles.actionButton} onClick={() => handleAcceptDeal(deal.dealId)}>
              Купить лид
            </Button>
          ),

          // ПРОДАВЕЦ может отменить сделку (пока она не завершена)
          isSeller && (deal.status === 'DEAL_STATUS_PENDING' || deal.status === 'DEAL_STATUS_ACCEPTED') && (
            <Button
              danger
              className={styles.actionButton}
              onClick={() => handleUpdateDeal(deal.dealId, { status: 'DEAL_STATUS_CANCELLED' })}
            >
              Отменить сделку
            </Button>
          ),

          // ПОКУПАТЕЛЬ может отклонить сделку (после принятия, до оплаты)
          isBuyer && deal.status === 'DEAL_STATUS_ACCEPTED' && (
            <Button
              danger
              className={styles.actionButton}
              onClick={() => handleUpdateDeal(deal.dealId, { status: 'DEAL_STATUS_REJECTED' })}
            >
              Отказаться
            </Button>
          ),

          // Кнопка оплаты для ПОКУПАТЕЛЯ когда сделка принята
          isBuyer && deal.status === 'DEAL_STATUS_ACCEPTED' && (
            <Button
              type="primary"
              className={styles.actionButton}
              loading={paymentLoading === deal.dealId}
              onClick={() => handlePayForDeal(deal)}
              icon={<DollarOutlined />}
            >
              Оплатить {formatPrice(deal.price)}
            </Button>
          ),

          // Кнопка проверки статуса платежа (если есть pending платёж)
          isBuyer && deal.status === 'DEAL_STATUS_ACCEPTED' && (
            <Button
              className={styles.actionButton}
              loading={checkingPayment === deal.dealId}
              onClick={() => handleCheckPaymentStatus(deal.dealId)}
            >
              Проверить оплату
            </Button>
          ),
        ].filter(Boolean)}
      >
        <List.Item.Meta
          avatar={
            <div className={styles.dealPrice}>
              <DollarOutlined style={{ fontSize: 24, color: '#1f71ff' }} />
              <div className={styles.priceValue}>{formatPrice(deal.price)}</div>
            </div>
          }
          title={
            <Space>
              <span
                className={styles.dealTitleLink}
                onClick={() => navigate(`/leads-catalog/${deal.leadId}`)}
              >
                {getLeadTitle(deal.leadId)}
              </span>
              <Tag color={STATUS_COLORS[deal.status]}>
                {STATUS_LABELS[deal.status]}
              </Tag>
              {/* Индикатор роли */}
              {currentUserId && (
                <Tag
                  color={
                    isSeller ? 'blue' :
                      isBuyer ? 'green' : 'default'
                  }
                  style={{ fontSize: '11px' }}
                >
                  {isSeller ? 'Вы продавец' :
                    isBuyer ? 'Вы покупатель' : 'Наблюдатель'}
                </Tag>
              )}
            </Space>
          }
          description={
            <Space direction="vertical" size={4}>
              <div>
                <Text type="secondary">Продавец: </Text>
                <Text>{getUserInfo(deal.sellerUserId)}</Text>
                {isSeller && <Tag color="blue" style={{ marginLeft: 8, fontSize: '10px' }}>Вы</Tag>}
              </div>
              {deal.buyerUserId && (
                <div>
                  <Text type="secondary">Покупатель: </Text>
                  <Text>{getUserInfo(deal.buyerUserId)}</Text>
                  {isBuyer && <Tag color="green" style={{ marginLeft: 8, fontSize: '10px' }}>Вы</Tag>}
                </div>
              )}
              <div>
                <Text type="secondary">Создано: </Text>
                <Text>{formatDate(deal.createdAt)}</Text>
              </div>
            </Space>
          }
        />
      </List.Item>
    );
  };

  const overallLoading = loading || leadsLoading;

  const filterDeals = (statuses: DealStatus[]) => {
    return deals.filter(deal => statuses.includes(deal.status));
  };
  const filterMyDealsByStatus = (statuses: DealStatus[]): Deal[] => {
    return filterMyDeals(deals).filter(deal => statuses.includes(deal.status));
  };

  const items = [
    {
      key: 'my',
      label: `Мои сделки (${filterMyDeals(deals).length})`,
      children: overallLoading ? (
        <div className={styles.loadingContainer}>
          <Spin size="large" />
          <div className={styles.loadingText}>Загрузка ваших сделок...</div>
        </div>
      ) : (() => {
        const myDeals = filterMyDeals(deals);

        return myDeals.length > 0 ? (
          <List
            dataSource={myDeals}
            renderItem={renderDealItem}
          />
        ) : (
          <Empty description="У вас пока нет сделок" />
        );
      })()
    },
    {
      key: 'my-active', // ЭТА ВКЛАДКА ИСПОЛЬЗУЕТ filterMyDealsByStatus
      label: `Мои активные (${filterMyDealsByStatus(['DEAL_STATUS_PENDING', 'DEAL_STATUS_ACCEPTED']).length})`,
      children: overallLoading ? (
        <div className={styles.loadingContainer}>
          <Spin size="large" />
        </div>
      ) : filterMyDealsByStatus(['DEAL_STATUS_PENDING', 'DEAL_STATUS_ACCEPTED']).length > 0 ? (
        <List
          dataSource={filterMyDealsByStatus(['DEAL_STATUS_PENDING', 'DEAL_STATUS_ACCEPTED'])}
          renderItem={renderDealItem}
        />
      ) : (
        <Empty description="У вас нет активных сделок" />
      ),
    },
    {
      key: 'all',
      label: `Все сделки (${deals.length})`,
      children: overallLoading ? (
        <div className={styles.loadingContainer}>
          <Spin size="large" />
          <div className={styles.loadingText}>Загрузка сделок и данных...</div>
        </div>
      ) : deals.length > 0 ? (
        <List
          dataSource={deals}
          renderItem={renderDealItem}
        />
      ) : (
        <Empty description="Сделки отсутствуют" />
      ),
    },
    {
      key: 'active',
      label: `Активные (${filterDeals(['DEAL_STATUS_PENDING', 'DEAL_STATUS_ACCEPTED']).length})`,
      children: overallLoading ? (
        <div className={styles.loadingContainer}>
          <Spin size="large" />
        </div>
      ) : filterDeals(['DEAL_STATUS_PENDING', 'DEAL_STATUS_ACCEPTED']).length > 0 ? (
        <List
          dataSource={filterDeals(['DEAL_STATUS_PENDING', 'DEAL_STATUS_ACCEPTED'])}
          renderItem={renderDealItem}
        />
      ) : (
        <Empty description="Активные сделки отсутствуют" />
      ),
    },
    {
      key: 'completed',
      label: `Завершенные (${filterDeals(['DEAL_STATUS_COMPLETED']).length})`,
      children: overallLoading ? (
        <div className={styles.loadingContainer}>
          <Spin size="large" />
        </div>
      ) : filterDeals(['DEAL_STATUS_COMPLETED']).length > 0 ? (
        <List
          dataSource={filterDeals(['DEAL_STATUS_COMPLETED'])}
          renderItem={renderDealItem}
        />
      ) : (
        <Empty description="Завершенные сделки отсутствуют" />
      ),
    },
    {
      key: 'cancelled',
      label: `Отмененные (${filterDeals(['DEAL_STATUS_CANCELLED', 'DEAL_STATUS_REJECTED']).length})`,
      children: overallLoading ? (
        <div className={styles.loadingContainer}>
          <Spin size="large" />
        </div>
      ) : filterDeals(['DEAL_STATUS_CANCELLED', 'DEAL_STATUS_REJECTED']).length > 0 ? (
        <List
          dataSource={filterDeals(['DEAL_STATUS_CANCELLED', 'DEAL_STATUS_REJECTED'])}
          renderItem={renderDealItem}
        />
      ) : (
        <Empty description="Отмененные сделки отсутствуют" />
      ),
    },
  ];

  if (error) {
    return (
      <div>
        <h1 style={{ marginBottom: 24, fontSize: 24, fontWeight: 600 }}>Сделки</h1>
        <Alert
          message="Ошибка загрузки"
          description={error}
          type="error"
          action={
            <Button size="small" onClick={() => window.location.reload()}>
              Попробовать снова
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24, fontWeight: 600 }}>Сделки</h1>
      {completingDeal && (
        <Alert
          message="Обработка платежа"
          description="Пожалуйста, подождите. Идёт проверка статуса оплаты и завершение сделки..."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <Card>
        <Tabs
          items={items}
          defaultActiveKey="my"
        />
      </Card>
    </div>
  );
};

export default DealsPage;