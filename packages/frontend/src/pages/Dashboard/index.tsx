import { useState } from 'react';
import { ArrowDownOutlined, ArrowUpOutlined, MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Space, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import styles from './styles.module.css';

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

interface ChartCard {
  id: string;
  title: string;
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

const METRICS: Metric[] = [
  { id: 'objects', label: 'Мои объекты', value: '42', trendLabel: '+2', trendType: 'up' },
  { id: 'new-leads', label: 'Новые лиды', value: '125', trendLabel: '+15%', trendType: 'up' },
  { id: 'conversion', label: 'Конверсия', value: '8.7%', trendLabel: '-1.2%', trendType: 'down' },
  { id: 'freshness', label: 'Свежесть лидов', value: '3 дня', trendLabel: '-1', trendType: 'neutral' },
];

const CHART_CARDS: ChartCard[] = [
  { id: 'leads-by-day', title: 'Лиды по дням' },
  { id: 'property-types', title: 'Типы объектов' },
  { id: 'credits-spending', title: 'Расход кредитов' },
];

const DashboardPage = () => {
  const navigate = useNavigate();
  const [metricsRange, setMetricsRange] = useState<MetricsRange>('30');

  const handleGoToCatalog = () => {
    navigate('/leads-catalog');
  };

  const handleRecommendationAction = (id: string) => {
    // TODO: Реализовать действия для каждой рекомендации
    console.log('Recommendation action:', id);
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
        <div className={styles.metricsGrid}>
          {METRICS.map((metric) => {
            const trendConfig = TREND_CONFIG[metric.trendType];
            return (
              <div key={metric.id} className={styles.metricCard}>
                <div className={styles.metricTop}>
                  <Text type="secondary">{metric.label}</Text>
                  <span className={`${styles.trend} ${trendConfig.className}`}>
                    {trendConfig.icon}
                    {metric.trendLabel}
                  </span>
                </div>
                <Title level={2} className={styles.metricValue}>
                  {metric.value}
                </Title>
              </div>
            );
          })}
        </div>
      </section>

      {/* Charts */}
      <section className={styles.chartsGrid} aria-label="Графики и аналитика">
        {CHART_CARDS.map((chart) => (
          <div key={chart.id} className={styles.chartCard}>
            <Title level={4} className={styles.chartTitle}>
              {chart.title}
            </Title>
            <div className={styles.chartPlaceholder}>График появится здесь</div>
          </div>
        ))}
      </section>
    </div>
  );
};

export default DashboardPage;
