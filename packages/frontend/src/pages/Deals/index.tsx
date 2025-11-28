import React, { useState, useEffect, useMemo } from 'react';
import { Card, Tabs, Empty, List, Button, Tag, Space, Spin, Alert, message } from 'antd';
import { dealsAPI } from '../../api';
import { useLeads } from '../../hooks/useLeads';
import type { Deal, DealStatus } from '../../types';
import styles from './styles.module.css';

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
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
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

  const filterMyDeals = (dealsList: Deal[]): Deal[] => {
    if (!currentUserId) return [];

    const myDeals = dealsList.filter(deal =>
      deal.sellerUserId === currentUserId ||
      deal.buyerUserId === currentUserId
    );



    return myDeals;
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
        actions={[
          // Кнопки для ПОКУПАТЕЛЯ (только если пользователь не продавец и есть права)
          !isSeller && deal.status === 'DEAL_STATUS_PENDING' && !deal.buyerUserId && (
            <Button type="primary" className={styles.actionButton} onClick={() => handleAcceptDeal(deal.dealId)}>
              Принять сделку
            </Button>
          ),

          // Кнопки для ПРОДАВЦА
          isSeller && (deal.status === 'DEAL_STATUS_PENDING' || deal.status === 'DEAL_STATUS_ACCEPTED') && (
            <Button
              danger
              className={styles.actionButton}
              onClick={() => handleUpdateDeal(deal.dealId, { status: 'DEAL_STATUS_CANCELLED' })}
            >
              Отменить
            </Button>
          ),

          isSeller && deal.status === 'DEAL_STATUS_ACCEPTED' && (
            <Button
              type="primary"
              className={styles.actionButton}
              onClick={() => handleUpdateDeal(deal.dealId, { status: 'DEAL_STATUS_COMPLETED' })}
            >
              Завершить
            </Button>
          ),

          // Кнопки для ПОКУПАТЕЛЯ
          isBuyer && deal.status === 'DEAL_STATUS_PENDING' && (
            <Button
              danger
              className={styles.actionButton}
              onClick={() => handleUpdateDeal(deal.dealId, { status: 'DEAL_STATUS_REJECTED' })}
            >
              Отклонить
            </Button>
          ),
        ].filter(Boolean)}
      >
        <List.Item.Meta
          title={
            <Space>
              <span>Сделка #{deal.dealId.slice(0, 8)}...</span>
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
                  style={{ fontSize: '12px' }}
                >
                  {isSeller ? 'Вы продавец' :
                    isBuyer ? 'Вы покупатель' : 'Наблюдатель'}
                </Tag>
              )}
            </Space>
          }
          description={
            <Space direction="vertical" size={4}>
              <div><strong>Лид:</strong> {getLeadTitle(deal.leadId)}</div>
              <div><strong>Цена:</strong> {formatPrice(deal.price)}</div>
              <div>
                <strong>Продавец:</strong> {getUserInfo(deal.sellerUserId)}
                {isSeller && <Tag color="blue" style={{ marginLeft: 8, fontSize: '12px' }}>Вы</Tag>}
              </div>
              {deal.buyerUserId && (
                <div>
                  <strong>Покупатель:</strong> {getUserInfo(deal.buyerUserId)}
                  {isBuyer && <Tag color="green" style={{ marginLeft: 8, fontSize: '12px' }}>Вы</Tag>}
                </div>
              )}
              <div><strong>Создано:</strong> {formatDate(deal.createdAt)}</div>
              {deal.updatedAt !== deal.createdAt && (
                <div><strong>Обновлено:</strong> {formatDate(deal.updatedAt)}</div>
              )}
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