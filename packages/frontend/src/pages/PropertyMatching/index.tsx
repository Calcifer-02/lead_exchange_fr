import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftOutlined,
  CloseOutlined,
  EnvironmentOutlined,
  ExpandOutlined,
  HeartFilled,
  HeartOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  StarFilled,
} from '@ant-design/icons';
import { Button, Modal, Spin, Typography, message } from 'antd';
import { propertiesAPI } from '../../api';
import { leadsAPI } from '../../api';
import type { PropertyMatch, Property, Lead } from '../../types';
import { PROPERTY_TYPE_LABELS } from '../../types';
import styles from './styles.module.css';

const { Title, Text } = Typography;

interface SwipeDirection {
  direction: 'left' | 'right' | null;
  cardIndex: number;
}

const PropertyMatchingPage = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();

  const [lead, setLead] = useState<Lead | null>(null);
  const [matches, setMatches] = useState<PropertyMatch[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>({ direction: null, cardIndex: -1 });
  const [likedProperties, setLikedProperties] = useState<Property[]>([]);
  const [passedProperties, setPassedProperties] = useState<Property[]>([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // Для обработки жестов свайпа
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);

  // Загружаем данные лида и матчи
  useEffect(() => {
    const loadData = async () => {
      if (!leadId) {
        message.error('ID лида не указан');
        navigate(-1);
        return;
      }

      try {
        setLoading(true);

        // Загружаем информацию о лиде
        const leadResponse = await leadsAPI.getLead(leadId);
        setLead(leadResponse.lead);

        // Загружаем матчи
        const response = await propertiesAPI.matchProperties({
          leadId,
          limit: 20,
        });

        setMatches(response.matches || []);
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        message.error('Не удалось загрузить данные для матчинга');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [leadId, navigate]);

  // Обработка свайпа влево (пропустить)
  const handleSwipeLeft = useCallback(() => {
    if (currentIndex >= matches.length) return;

    const property = matches[currentIndex].property;
    setSwipeDirection({ direction: 'left', cardIndex: currentIndex });
    setPassedProperties((prev) => [...prev, property]);

    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setSwipeDirection({ direction: null, cardIndex: -1 });
    }, 400);
  }, [currentIndex, matches]);

  // Обработка свайпа вправо (лайк)
  const handleSwipeRight = useCallback(() => {
    if (currentIndex >= matches.length) return;

    const property = matches[currentIndex].property;
    setSwipeDirection({ direction: 'right', cardIndex: currentIndex });
    setLikedProperties((prev) => [...prev, property]);

    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setSwipeDirection({ direction: null, cardIndex: -1 });
    }, 400);
  }, [currentIndex, matches]);

  // Суперлайк
  const handleSuperLike = useCallback(() => {
    if (currentIndex >= matches.length) return;

    const property = matches[currentIndex].property;
    setSwipeDirection({ direction: 'right', cardIndex: currentIndex });
    setLikedProperties((prev) => [...prev, property]);
    message.success('Суперлайк! ⭐');

    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setSwipeDirection({ direction: null, cardIndex: -1 });
    }, 400);
  }, [currentIndex, matches]);

  // Показать детали
  const handleShowDetails = useCallback(() => {
    if (currentIndex >= matches.length) return;

    setSelectedProperty(matches[currentIndex].property);
    setDetailModalVisible(true);
  }, [currentIndex, matches]);

  // Обработчики touch событий
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    currentX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const diff = currentX.current - startX.current;
    const threshold = 100;

    if (diff > threshold) {
      handleSwipeRight();
    } else if (diff < -threshold) {
      handleSwipeLeft();
    }
  };

  // Обработчики mouse событий
  const handleMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    isDragging.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    currentX.current = e.clientX;
  };

  const handleMouseUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const diff = currentX.current - startX.current;
    const threshold = 100;

    if (diff > threshold) {
      handleSwipeRight();
    } else if (diff < -threshold) {
      handleSwipeLeft();
    }
  };

  // Клавиатурное управление
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (detailModalVisible) return;

      switch (e.key) {
        case 'ArrowLeft':
          handleSwipeLeft();
          break;
        case 'ArrowRight':
          handleSwipeRight();
          break;
        case 'ArrowUp':
          handleSuperLike();
          break;
        case ' ':
          handleShowDetails();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSwipeLeft, handleSwipeRight, handleSuperLike, handleShowDetails, detailModalVisible]);

  // Сброс и перезагрузка
  const handleReload = async () => {
    setCurrentIndex(0);
    setLikedProperties([]);
    setPassedProperties([]);
    setLoading(true);

    try {
      if (leadId) {
        const response = await propertiesAPI.matchProperties({
          leadId,
          limit: 20,
        });
        setMatches(response.matches || []);
      }
    } catch (error) {
      console.error('Ошибка перезагрузки:', error);
      message.error('Не удалось обновить матчи');
    } finally {
      setLoading(false);
    }
  };

  // Форматирование цены
  const formatPrice = (price: string) => {
    const num = parseInt(price, 10);
    if (isNaN(num)) return price;
    return new Intl.NumberFormat('ru-RU').format(num) + ' ₽';
  };

  // Получение класса карточки
  const getCardClass = (index: number) => {
    const relativeIndex = index - currentIndex;

    if (swipeDirection.cardIndex === index) {
      return swipeDirection.direction === 'left'
        ? styles.swipingLeft
        : styles.swipingRight;
    }

    if (relativeIndex === 0) return styles.active;
    if (relativeIndex === 1) return styles.next;
    return styles.hidden;
  };

  // Рендер карточки недвижимости
  const renderPropertyCard = (match: PropertyMatch, index: number) => {
    const { property, similarity } = match;
    const similarityPercent = Math.round(similarity * 100);

    return (
      <div
        key={property.propertyId}
        ref={index === currentIndex ? cardRef : null}
        className={`${styles.cardWrapper} ${getCardClass(index)}`}
        onTouchStart={index === currentIndex ? handleTouchStart : undefined}
        onTouchMove={index === currentIndex ? handleTouchMove : undefined}
        onTouchEnd={index === currentIndex ? handleTouchEnd : undefined}
        onMouseDown={index === currentIndex ? handleMouseDown : undefined}
        onMouseMove={index === currentIndex ? handleMouseMove : undefined}
        onMouseUp={index === currentIndex ? handleMouseUp : undefined}
        onMouseLeave={index === currentIndex ? handleMouseUp : undefined}
      >
        <div className={styles.propertyCard}>
          {/* Изображение */}
          <div className={styles.cardImage}>
            <HomeOutlined className={styles.placeholderIcon} />
            <div className={styles.similarityBadge}>{similarityPercent}% совпадение</div>
            <div className={styles.typeBadge}>
              {PROPERTY_TYPE_LABELS[property.propertyType]}
            </div>
          </div>

          {/* Контент */}
          <div className={styles.cardContent}>
            <h2 className={styles.cardTitle}>{property.title}</h2>
            <p className={styles.cardPrice}>{formatPrice(property.price)}</p>

            <div className={styles.cardAddress}>
              <EnvironmentOutlined />
              <span>{property.address || 'Адрес не указан'}</span>
            </div>

            <div className={styles.cardFeatures}>
              <div className={styles.feature}>
                <ExpandOutlined className={styles.featureIcon} />
                <span>{property.area} м²</span>
              </div>
              <div className={styles.feature}>
                <HomeOutlined className={styles.featureIcon} />
                <span>{property.rooms} комн.</span>
              </div>
            </div>

            <p className={styles.cardDescription}>
              {property.description || 'Описание отсутствует'}
            </p>
          </div>

          {/* Индикаторы свайпа */}
          <div
            className={`${styles.swipeIndicator} ${styles.like} ${
              swipeDirection.direction === 'right' && swipeDirection.cardIndex === index
                ? styles.visible
                : ''
            }`}
          >
            <HeartFilled /> Нравится
          </div>
          <div
            className={`${styles.swipeIndicator} ${styles.nope} ${
              swipeDirection.direction === 'left' && swipeDirection.cardIndex === index
                ? styles.visible
                : ''
            }`}
          >
            <CloseOutlined /> Пропустить
          </div>
        </div>
      </div>
    );
  };

  // Рендер пустого состояния
  const renderEmptyState = () => (
    <div className={styles.emptyState}>
      {currentIndex >= matches.length && matches.length > 0 ? (
        <>
          <HeartOutlined className={styles.emptyIcon} />
          <div className={styles.emptyTitle}>Все объекты просмотрены!</div>
          <div className={styles.emptyText}>
            Вы просмотрели все подходящие объекты. Можете посмотреть понравившиеся или начать заново.
          </div>
          <Button
            icon={<ReloadOutlined />}
            size="large"
            className={styles.emptyButton}
            onClick={handleReload}
          >
            Начать заново
          </Button>

          {/* Статистика */}
          {(likedProperties.length > 0 || passedProperties.length > 0) && (
            <div className={styles.resultsSummary}>
              <div className={styles.summaryTitle}>Ваши результаты</div>
              <div className={styles.summaryStats}>
                <div className={styles.statItem}>
                  <span className={`${styles.statNumber} ${styles.liked}`}>
                    {likedProperties.length}
                  </span>
                  <span className={styles.statLabel}>Понравилось</span>
                </div>
                <div className={styles.statItem}>
                  <span className={`${styles.statNumber} ${styles.passed}`}>
                    {passedProperties.length}
                  </span>
                  <span className={styles.statLabel}>Пропущено</span>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <HomeOutlined className={styles.emptyIcon} />
          <div className={styles.emptyTitle}>Нет подходящих объектов</div>
          <div className={styles.emptyText}>
            К сожалению, для этого лида пока нет подходящих объектов недвижимости.
          </div>
          <Button
            icon={<ArrowLeftOutlined />}
            size="large"
            className={styles.emptyButton}
            onClick={() => navigate(-1)}
          >
            Вернуться назад
          </Button>
        </>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingContainer}>
          <Spin size="large" />
          <div className={styles.loadingText}>Ищем подходящие объекты...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Заголовок */}
      <div className={styles.header}>
        <Button
          icon={<ArrowLeftOutlined />}
          className={styles.backButton}
          onClick={() => navigate(-1)}
        >
          Назад
        </Button>
        <Title level={4} className={styles.title}>
          {lead?.title || 'Подбор объектов'}
        </Title>
        {matches.length > 0 && currentIndex < matches.length && (
          <div className={styles.counter}>
            {currentIndex + 1} / {matches.length}
          </div>
        )}
      </div>

      {/* Стек карточек */}
      {matches.length > 0 && currentIndex < matches.length ? (
        <>
          <div className={styles.cardStack}>
            {matches
              .slice(currentIndex, currentIndex + 3)
              .map((match, idx) => renderPropertyCard(match, currentIndex + idx))}
          </div>

          {/* Кнопки действий */}
          <div className={styles.actionButtons}>
            <button
              className={`${styles.actionButton} ${styles.dislike}`}
              onClick={handleSwipeLeft}
              title="Пропустить (←)"
            >
              <CloseOutlined />
            </button>
            <button
              className={`${styles.actionButton} ${styles.superlike}`}
              onClick={handleSuperLike}
              title="Суперлайк (↑)"
            >
              <StarFilled />
            </button>
            <button
              className={`${styles.actionButton} ${styles.like}`}
              onClick={handleSwipeRight}
              title="Нравится (→)"
            >
              <HeartFilled />
            </button>
            <button
              className={`${styles.actionButton} ${styles.info}`}
              onClick={handleShowDetails}
              title="Подробнее (пробел)"
            >
              <InfoCircleOutlined />
            </button>
          </div>

          {/* Мини-статистика */}
          {(likedProperties.length > 0 || passedProperties.length > 0) && (
            <div className={styles.resultsSummary}>
              <div className={styles.summaryStats}>
                <div className={styles.statItem}>
                  <span className={`${styles.statNumber} ${styles.liked}`}>
                    {likedProperties.length}
                  </span>
                  <span className={styles.statLabel}>Понравилось</span>
                </div>
                <div className={styles.statItem}>
                  <span className={`${styles.statNumber} ${styles.passed}`}>
                    {passedProperties.length}
                  </span>
                  <span className={styles.statLabel}>Пропущено</span>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        renderEmptyState()
      )}

      {/* Модальное окно с деталями */}
      <Modal
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={500}
        className={styles.detailModal}
        destroyOnHidden
      >
        {selectedProperty && (
          <>
            <div className={styles.detailHeader}>
              <HomeOutlined className={styles.detailIcon} />
            </div>

            <Title level={3} className={styles.detailTitle}>
              {selectedProperty.title}
            </Title>

            <Title level={4} className={styles.detailPrice}>
              {formatPrice(selectedProperty.price)}
            </Title>

            <div className={styles.detailAddress}>
              <EnvironmentOutlined />
              <span>{selectedProperty.address || 'Адрес не указан'}</span>
            </div>

            <div className={styles.detailFeatures}>
              <div className={styles.feature}>
                <ExpandOutlined className={styles.featureIcon} />
                <span>{selectedProperty.area} м²</span>
              </div>
              <div className={styles.feature}>
                <HomeOutlined className={styles.featureIcon} />
                <span>{selectedProperty.rooms} комн.</span>
              </div>
              <div className={styles.feature}>
                <Text type="secondary">
                  {PROPERTY_TYPE_LABELS[selectedProperty.propertyType]}
                </Text>
              </div>
            </div>

            <Text className={styles.detailDescription}>
              {selectedProperty.description || 'Описание отсутствует'}
            </Text>

            <div className={styles.detailActions}>
              <Button
                type="primary"
                icon={<HeartFilled />}
                size="large"
                block
                onClick={() => {
                  handleSwipeRight();
                  setDetailModalVisible(false);
                }}
              >
                Нравится
              </Button>
              <Button
                icon={<CloseOutlined />}
                size="large"
                block
                onClick={() => {
                  handleSwipeLeft();
                  setDetailModalVisible(false);
                }}
              >
                Пропустить
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default PropertyMatchingPage;

