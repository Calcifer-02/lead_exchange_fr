import { useEffect, useState } from 'react';
import { ArrowDownOutlined, ArrowUpOutlined, MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Empty, Space, Spin, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import styles from './styles.module.css';
import { type DealStatusStats, statsAPI, type DashboardMetrics } from '../../api/stats.ts';
import type { DealStats } from '../../api/stats';

const { Title, Text, Paragraph } = Typography;

// Types
type TrendType = 'up' | 'down' | 'neutral';
type MetricsRange = '7' | '30' | '90';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  image: string;
  action?: () => void;
}

interface Metric {
  id: string;
  label: string;
  value: string;
  trendLabel: string;
  trendType: TrendType;
}

interface RangeFilter {
  id: MetricsRange;
  label: string;
}

// Constants
const TREND_CONFIG: Record<TrendType, { icon: React.ReactNode; className: string }> = {
  up: { icon: <ArrowUpOutlined />, className: styles.trendUp },
  down: { icon: <ArrowDownOutlined />, className: styles.trendDown },
  neutral: { icon: <MinusOutlined />, className: styles.trendNeutral },
};

const RANGE_FILTERS: RangeFilter[] = [
  { id: '7', label: '7 дней' },
  { id: '30', label: '30 дней' },
  { id: '90', label: '90 дней' },
];

// Mock data - в будущем заменить на API запросы
const RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'moscow-hot',
    title: 'Горячие лиды в Москве',
    description: '5 новых премиум-лидов доступны в вашем районе.',
    actionLabel: 'Посмотреть',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'colleague-match',
    title: 'Свяжитесь с коллегой',
    description: 'У Алексея П. есть подходящий объект для вашего клиента.',
    actionLabel: 'Написать',
    image: 'https://images.unsplash.com/photo-1522252234503-e356532cafd5?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'top-up',
    title: 'Пополните баланс',
    description: 'Получите доступ к премиум-лидам и расширенным функциям.',
    actionLabel: 'Пополнить',
    image: 'https://images.unsplash.com/photo-1454165205744-3b78555e5572?auto=format&fit=crop&w=1200&q=80',
  },
];

const DashboardPage = () => {
  const navigate = useNavigate();
  const [metricsRange, setMetricsRange] = useState<MetricsRange>('30');
  const [dealsStats, setDealsStats] = useState<DealStats[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [dealStatusStats, setDealStatusStats] = useState<DealStatusStats[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [previousMetrics, setPreviousMetrics] = useState<DashboardMetrics | null>(null);

  const handleGoToCatalog = () => {
    navigate('/leads-catalog');
  };

  const handleRecommendationAction = (id: string) => {
    console.log('Recommendation action:', id);
  };

  useEffect(() => {
    const loadStats = async () => {
      try {
        setStatsLoading(true);

        const days = parseInt(metricsRange);
        const [dealsData, statusData, metricsData] = await Promise.all([
          statsAPI.getDealsStats(days),
          statsAPI.getDealsByStatus(),
          statsAPI.getDashboardMetrics()
        ]);

        // Сохраняем предыдущие метрики для расчета трендов
        setPreviousMetrics(dashboardMetrics);
        setDashboardMetrics(metricsData);
        setDealsStats(dealsData);
        setDealStatusStats(statusData);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
  }, [metricsRange]);

  // Функция для расчета тренда
  const calculateTrend = (current: number, previous: number | null): { trendType: TrendType; trendLabel: string } => {
    if (!previous) {
      return { trendType: 'neutral', trendLabel: '' };
    }

    const change = ((current - previous) / previous) * 100;
    const absChange = Math.abs(Math.round(change));

    if (change > 5) {
      return { trendType: 'up', trendLabel: `+${absChange}%` };
    } else if (change < -5) {
      return { trendType: 'down', trendLabel: `-${absChange}%` };
    } else if (absChange > 0) {
      return { trendType: 'neutral', trendLabel: `${absChange}%` };
    } else {
      return { trendType: 'neutral', trendLabel: '' };
    }
  };

  // Форматирование чисел
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  const formatPrice = (price: number): string => {
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)}M ₽`;
    }
    return `${formatNumber(price)} ₽`;
  };

  // Реальные метрики
  const REAL_METRICS: Metric[] = dashboardMetrics ? [
    {
      id: 'total-leads',
      label: 'Всего лидов',
      value: formatNumber(dashboardMetrics.totalLeads),
      ...calculateTrend(dashboardMetrics.totalLeads, previousMetrics?.totalLeads || null)
    },
    {
      id: 'active-deals',
      label: 'Активные сделки',
      value: formatNumber(dashboardMetrics.activeDeals),
      ...calculateTrend(dashboardMetrics.activeDeals, previousMetrics?.activeDeals || null)
    },
    {
      id: 'conversion',
      label: 'Конверсия',
      value: `${dashboardMetrics.conversionRate}%`,
      ...calculateTrend(dashboardMetrics.conversionRate, previousMetrics?.conversionRate || null)
    },
    {
      id: 'avg-price',
      label: 'Средняя цена',
      value: formatPrice(dashboardMetrics.avgDealPrice),
      ...calculateTrend(dashboardMetrics.avgDealPrice, previousMetrics?.avgDealPrice || null)
    },
    {
      id: 'month-deals',
      label: 'Сделки за месяц',
      value: formatNumber(dashboardMetrics.dealsThisMonth),
      ...calculateTrend(dashboardMetrics.dealsThisMonth, previousMetrics?.dealsThisMonth || null)
    },
    {
      id: 'total-deals',
      label: 'Всего сделок',
      value: formatNumber(dashboardMetrics.totalDeals),
      ...calculateTrend(dashboardMetrics.totalDeals, previousMetrics?.totalDeals || null)
    }
  ] : [];

  // Вспомогательная функция для цветов
  const getColorByIndex = (index: number): string => {
    const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#fa541c'];
    return colors[index % colors.length];
  };

  // Компонент для графика "Сделки по дням"
  const renderLeadsByDayChart = () => {
    if (statsLoading) {
      return <Spin size="large" />;
    }

    if (dealsStats.length === 0) {
      return <Empty description="Нет данных о сделках" />;
    }

    const maxCount = Math.max(...dealsStats.map(stat => stat.count));

    return (
      <div className={styles.chartContainer}>
        <div className={styles.barChart}>
          {dealsStats.map((stat, index) => (
            <div key={index} className={styles.barChartItem}>
              <div className={styles.barContainer}>
                <div
                  className={styles.bar}
                  style={{
                    height: maxCount > 0 ? `${(stat.count / maxCount) * 100}%` : '0%'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className={styles.barLabels}>
          {dealsStats.map((stat, index) => (
            <span key={index} className={styles.barLabelItem}>
              <Text type="secondary" className={styles.barLabel}>
                {new Date(stat.date).getDate()}
              </Text>
              <Text className={styles.barValue}>{stat.count}</Text>
            </span>
          ))}
        </div>
      </div>
    );
  };

  // Компонент для графика "Статусы сделок"
  const renderDealStatusChart = () => {
    if (statsLoading) {
      return <Spin size="large" />;
    }

    if (dealStatusStats.length === 0) {
      return <Empty description="Нет данных о статусах сделок" />;
    }

    const maxCount = Math.max(...dealStatusStats.map(stat => stat.count));

    return (
      <div className={styles.chartContainer}>
        <div className={styles.barChart}>
          {dealStatusStats.map((stat, index) => (
            <div key={stat.status} className={styles.barChartItem}>
              <div className={styles.barContainer}>
                <div
                  className={styles.bar}
                  style={{
                    height: maxCount > 0 ? `${(stat.count / maxCount) * 100}%` : '0%',
                    backgroundColor: getColorByIndex(index)
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className={styles.barLabels}>
          {dealStatusStats.map((stat) => (
            <span key={stat.status} className={styles.barLabelItem}>
              <Text type="secondary" className={styles.barLabel}>
                {stat.status}
              </Text>
              <Text className={styles.barValue}>{stat.count}</Text>
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderContent}>
          <Title level={2} className={styles.pageTitle}>
            Дашборд
          </Title>
          <Paragraph className={styles.pageDescription}>
            Обзор вашей активности и инсайты от ИИ.
          </Paragraph>
        </div>
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={handleGoToCatalog}
          className={styles.actionButton}
        >
          Перейти в каталог лидов
        </Button>
      </header>

      {/* AI Recommendations */}
      <section className={styles.recommendations} aria-labelledby="ai-recommendations">
        <div className={styles.recommendationsHeader}>
          <Title id="ai-recommendations" level={4} className={styles.sectionTitle}>
            Рекомендации от ИИ
          </Title>
        </div>
        <div className={styles.recommendationsGrid}>
          {RECOMMENDATIONS.map((item) => (
            <Card
              key={item.id}
              hoverable
              cover={<img alt={item.title} src={item.image} className={styles.recommendationImage} />}
              className={styles.recommendationCard}
            >
              <Space direction="vertical" size={8} className={styles.recommendationContent}>
                <Title level={5} className={styles.recommendationTitle}>
                  {item.title}
                </Title>
                <Text type="secondary">{item.description}</Text>
              </Space>
              <Button
                className={styles.outlinedButton}
                onClick={() => handleRecommendationAction(item.id)}
              >
                {item.actionLabel}
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* Key Metrics */}
      <section className={styles.metricsSection} aria-labelledby="key-metrics">
        <div className={styles.metricsHeader}>
          <Title id="key-metrics" level={4} className={styles.sectionTitle}>
            Ключевые показатели
          </Title>
          <div className={styles.metricsFilters} role="group" aria-label="Фильтр периода">
            {RANGE_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setMetricsRange(filter.id)}
                className={`${styles.filterButton} ${
                  filter.id === metricsRange ? styles.filterButtonActive : ''
                }`}
                aria-pressed={filter.id === metricsRange}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {statsLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>Загрузка метрик...</div>
          </div>
        ) : (
          <div className={styles.metricsGrid}>
            {REAL_METRICS.map((metric) => {
              const trendConfig = TREND_CONFIG[metric.trendType];
              return (
                <div key={metric.id} className={styles.metricCard}>
                  <div className={styles.metricTop}>
                    <Text type="secondary">{metric.label}</Text>
                    {metric.trendLabel && (
                      <span className={`${styles.trend} ${trendConfig.className}`}>
                        {trendConfig.icon}
                        {metric.trendLabel}
                      </span>
                    )}
                  </div>
                  <Title level={2} className={styles.metricValue}>
                    {metric.value}
                  </Title>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Charts */}
      <section className={styles.chartsGrid} aria-label="Графики и аналитика">
        <div className={styles.chartCard}>
          <Title level={4} className={styles.chartTitle}>
            Сделки по дням
          </Title>
          {renderLeadsByDayChart()}
        </div>

        <div className={styles.chartCard}>
          <Title level={4} className={styles.chartTitle}>
            Статусы сделок
          </Title>
          {renderDealStatusChart()}
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
