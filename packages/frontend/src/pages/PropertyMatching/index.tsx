import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CloseOutlined,
  EnvironmentOutlined,
  ExpandOutlined,
  HeartFilled,
  HeartOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  StarFilled,
  SearchOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Button, Modal, Spin, Typography, message, Select, Card, Empty, Space, Tag } from 'antd';
import { propertiesAPI, leadsAPI } from '../../api';
import type { PropertyMatch, Property, Lead } from '../../types';
import { PROPERTY_TYPE_LABELS } from '../../types';
import styles from './styles.module.css';

const { Title, Text } = Typography;

interface SwipeDirection {
  direction: 'left' | 'right' | null;
  cardIndex: number;
}

const PropertyMatchingPage = () => {
  const { leadId: paramLeadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();

  // Состояния для выбора лида
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(paramLeadId || null);
  const [leadsLoading, setLeadsLoading] = useState(true);

  const [lead, setLead] = useState<Lead | null>(null);
  const [matches, setMatches] = useState<PropertyMatch[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [matchingStarted, setMatchingStarted] = useState(!!paramLeadId);
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
  const [dragOffset, setDragOffset] = useState(0);
  const [isDraggingState, setIsDraggingState] = useState(false);

  // Загружаем список лидов пользователя при монтировании
  useEffect(() => {
    const loadLeads = async () => {
      try {
        setLeadsLoading(true);
        const userId = localStorage.getItem('userId');
        if (userId) {
          const response = await leadsAPI.listLeads({ createdUserId: userId });
          // Фильтруем только опубликованные (промодерированные) лиды
          const publishedLeads = (response.leads || []).filter(
            (lead) => lead.status === 'LEAD_STATUS_PUBLISHED'
          );
          setLeads(publishedLeads);
        }
      } catch (error) {
        console.error('Ошибка загрузки лидов:', error);
        message.error('Не удалось загрузить список лидов');
      } finally {
        setLeadsLoading(false);
      }
    };

    loadLeads();
  }, []);

  // Если есть paramLeadId, сразу запускаем матчинг
  useEffect(() => {
    if (paramLeadId) {
      setSelectedLeadId(paramLeadId);
      startMatching(paramLeadId);
    }
  }, [paramLeadId]);

  // Запуск матчинга
  const startMatching = async (leadIdToMatch: string) => {
    if (!leadIdToMatch) {
      message.warning('Выберите лид для подбора');
      return;
    }

    try {
      setLoading(true);
      setMatchingStarted(true);
      setCurrentIndex(0);
      setLikedProperties([]);
      setPassedProperties([]);

      // Загружаем информацию о лиде
      const leadResponse = await leadsAPI.getLead(leadIdToMatch);
      setLead(leadResponse.lead);

      // Загружаем матчи (только опубликованные объекты)
      const response = await propertiesAPI.matchProperties({
        leadId: leadIdToMatch,
        limit: 20,
        filter: {
          status: 'PROPERTY_STATUS_PUBLISHED',
        },
      });

      setMatches(response.matches || []);

      if (!response.matches || response.matches.length === 0) {
        message.info('Не найдено подходящих объектов для этого лида');
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      message.error('Не удалось загрузить данные для матчинга');
    } finally {
      setLoading(false);
    }
  };

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
    currentX.current = e.touches[0].clientX;
    isDragging.current = true;
    setIsDraggingState(true);
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    setDragOffset(diff);
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setIsDraggingState(false);

    const diff = currentX.current - startX.current;
    const threshold = 120; // Увеличенный порог для более контролируемого свайпа

    if (diff > threshold) {
      handleSwipeRight();
    } else if (diff < -threshold) {
      handleSwipeLeft();
    }

    // Плавный возврат карточки на место
    setDragOffset(0);
  };

  // Обработчики mouse событий
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startX.current = e.clientX;
    currentX.current = e.clientX;
    isDragging.current = true;
    setIsDraggingState(true);
    setDragOffset(0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    currentX.current = e.clientX;
    const diff = currentX.current - startX.current;
    setDragOffset(diff);
  };

  const handleMouseUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setIsDraggingState(false);

    const diff = currentX.current - startX.current;
    const threshold = 120; // Увеличенный порог для более контролируемого свайпа

    if (diff > threshold) {
      handleSwipeRight();
    } else if (diff < -threshold) {
      handleSwipeLeft();
    }

    // Плавный возврат карточки на место
    setDragOffset(0);
  };

  // Клавиатурное управление
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (detailModalVisible || !matchingStarted) return;

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
  }, [handleSwipeLeft, handleSwipeRight, handleSuperLike, handleShowDetails, detailModalVisible, matchingStarted]);

  // Сброс и перезагрузка
  const handleReload = async () => {
    if (selectedLeadId) {
      await startMatching(selectedLeadId);
    }
  };

  // Вернуться к выбору лида
  const handleBackToSelection = () => {
    setMatchingStarted(false);
    setMatches([]);
    setLead(null);
    setCurrentIndex(0);
    setLikedProperties([]);
    setPassedProperties([]);
    // Если пришли по прямой ссылке, возвращаемся назад
    if (paramLeadId) {
      navigate('/matching');
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
    const isCurrentCard = index === currentIndex;

    // Вычисляем стили для текущей карточки при перетаскивании
    const getDragStyle = (): React.CSSProperties => {
      if (!isCurrentCard || !isDraggingState) return {};

      const rotation = dragOffset * 0.05; // Небольшой поворот при перетаскивании
      const maxRotation = 15;
      const clampedRotation = Math.max(-maxRotation, Math.min(maxRotation, rotation));

      return {
        transform: `translateX(${dragOffset}px) rotate(${clampedRotation}deg)`,
        transition: 'none', // Отключаем transition при перетаскивании
      };
    };

    // Вычисляем прозрачность индикаторов на основе смещения
    const leftIndicatorOpacity = Math.min(1, Math.max(0, -dragOffset / 120));
    const rightIndicatorOpacity = Math.min(1, Math.max(0, dragOffset / 120));

    return (
      <div
        key={property.propertyId}
        ref={isCurrentCard ? cardRef : null}
        className={`${styles.cardWrapper} ${getCardClass(index)}`}
        style={getDragStyle()}
        onTouchStart={isCurrentCard ? handleTouchStart : undefined}
        onTouchMove={isCurrentCard ? handleTouchMove : undefined}
        onTouchEnd={isCurrentCard ? handleTouchEnd : undefined}
        onMouseDown={isCurrentCard ? handleMouseDown : undefined}
        onMouseMove={isCurrentCard ? handleMouseMove : undefined}
        onMouseUp={isCurrentCard ? handleMouseUp : undefined}
        onMouseLeave={isCurrentCard ? handleMouseUp : undefined}
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

            {property.description && (
              <p className={styles.cardDescription}>
                {property.description.length > 120
                  ? property.description.substring(0, 120) + '...'
                  : property.description}
              </p>
            )}
          </div>

          {/* Индикаторы свайпа - показываем при перетаскивании */}
          <div
            className={`${styles.swipeIndicator} ${styles.swipeLeft}`}
            style={{ opacity: leftIndicatorOpacity }}
          >
            <CloseOutlined />
            <span>Пропустить</span>
          </div>
          <div
            className={`${styles.swipeIndicator} ${styles.swipeRight}`}
            style={{ opacity: rightIndicatorOpacity }}
          >
            <HeartFilled />
            <span>Нравится</span>
          </div>
        </div>
      </div>
    );
  };

  // Рендер экрана выбора лида
  const renderLeadSelection = () => (
    <div className={styles.selectionContainer}>
      <Card className={styles.selectionCard}>
        <div className={styles.selectionHeader}>
          <ThunderboltOutlined className={styles.selectionIcon} />
          <Title level={2} className={styles.selectionTitle}>AI-Матчинг объектов</Title>
          <Text type="secondary" className={styles.selectionSubtitle}>
            Выберите лид, для которого хотите подобрать подходящие объекты недвижимости
          </Text>
        </div>

        <div className={styles.selectionForm}>
          <Select
            placeholder="Выберите лид"
            value={selectedLeadId}
            onChange={setSelectedLeadId}
            loading={leadsLoading}
            className={styles.leadSelect}
            size="large"
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
            }
            options={leads.map((lead) => ({
              value: lead.leadId,
              label: lead.title,
            }))}
            notFoundContent={leadsLoading ? <Spin size="small" /> : 'Нет лидов'}
          />

          <Button
            type="primary"
            size="large"
            icon={<SearchOutlined />}
            onClick={() => selectedLeadId && startMatching(selectedLeadId)}
            disabled={!selectedLeadId}
            loading={loading}
            className={styles.startButton}
          >
            Подобрать объекты
          </Button>
        </div>

        {leads.length === 0 && !leadsLoading && (
          <Empty
            description="У вас пока нет опубликованных лидов. Лиды должны пройти модерацию перед использованием в матчинге."
            className={styles.emptyLeads}
          >
            <Button type="primary" onClick={() => navigate('/leads/new')}>
              Создать лид
            </Button>
          </Empty>
        )}

        <div className={styles.selectionHints}>
          <Text type="secondary">
            <InfoCircleOutlined /> Используйте клавиши ← → для свайпа, ↑ для суперлайка
          </Text>
        </div>
      </Card>
    </div>
  );

  // Если матчинг не начат, показываем экран выбора лида
  if (!matchingStarted) {
    return (
      <div className={styles.page}>
        {renderLeadSelection()}
      </div>
    );
  }

  // Загрузка
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingContainer}>
          <Spin size="large" />
          <Text className={styles.loadingText}>Ищем подходящие объекты...</Text>
        </div>
      </div>
    );
  }

  // Все карточки просмотрены
  const isFinished = currentIndex >= matches.length;

  return (
    <div className={styles.page}>
      {/* Шапка */}
      <div className={styles.header}>
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={handleBackToSelection}
          className={styles.backButton}
        >
          Назад
        </Button>

        <div className={styles.headerInfo}>
          <Title level={4} className={styles.headerTitle}>
            {lead?.title || 'Матчинг'}
          </Title>
          {!isFinished && (
            <Text type="secondary">
              {currentIndex + 1} / {matches.length} объектов
            </Text>
          )}
        </div>

        <Button
          type="text"
          icon={<ReloadOutlined />}
          onClick={handleReload}
          className={styles.reloadButton}
        />
      </div>

      {/* Статистика */}
      <div className={styles.stats}>
        <div className={styles.statItem}>
          <HeartFilled className={styles.likeIcon} />
          <span>{likedProperties.length}</span>
        </div>
        <div className={styles.statItem}>
          <CloseOutlined className={styles.passIcon} />
          <span>{passedProperties.length}</span>
        </div>
      </div>

      {/* Контейнер карточек */}
      <div className={styles.cardsContainer}>
        {matches.length === 0 ? (
          <div className={styles.noMatches}>
            <HomeOutlined className={styles.noMatchesIcon} />
            <Title level={4}>Нет подходящих объектов</Title>
            <Text type="secondary">
              Попробуйте изменить параметры лида или добавить больше объектов
            </Text>
            <Space style={{ marginTop: 24 }}>
              <Button onClick={handleBackToSelection}>Выбрать другой лид</Button>
              <Button type="primary" onClick={handleReload}>
                Обновить
              </Button>
            </Space>
          </div>
        ) : isFinished ? (
          <div className={styles.finished}>
            <Title level={3}>Просмотр завершён!</Title>
            <Text type="secondary">
              Вам понравилось {likedProperties.length} объектов
            </Text>

            {likedProperties.length > 0 && (
              <div className={styles.likedList}>
                <Title level={5}>Понравившиеся объекты:</Title>
                {likedProperties.map((property) => (
                  <div
                    key={property.propertyId}
                    className={styles.likedItem}
                    onClick={() => navigate(`/properties/${property.propertyId}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <HomeOutlined />
                    <span className={styles.likedItemTitle}>{property.title}</span>
                    <Tag color="green">{formatPrice(property.price)}</Tag>
                  </div>
                ))}
              </div>
            )}

            <Space style={{ marginTop: 24 }}>
              <Button onClick={handleBackToSelection}>Выбрать другой лид</Button>
              <Button type="primary" onClick={handleReload}>
                Начать заново
              </Button>
            </Space>
          </div>
        ) : (
          <>
            {matches.map((match, index) => renderPropertyCard(match, index))}
          </>
        )}
      </div>

      {/* Кнопки управления */}
      {!isFinished && matches.length > 0 && (
        <div className={styles.controls}>
          <button
            className={`${styles.controlButton} ${styles.dislikeButton}`}
            onClick={handleSwipeLeft}
            title="Пропустить (←)"
          >
            <CloseOutlined />
          </button>

          <button
            className={`${styles.controlButton} ${styles.superlikeButton}`}
            onClick={handleSuperLike}
            title="Суперлайк (↑)"
          >
            <StarFilled />
          </button>

          <button
            className={`${styles.controlButton} ${styles.infoButton}`}
            onClick={handleShowDetails}
            title="Подробнее (Пробел)"
          >
            <InfoCircleOutlined />
          </button>

          <button
            className={`${styles.controlButton} ${styles.likeButton}`}
            onClick={handleSwipeRight}
            title="Нравится (→)"
          >
            <HeartOutlined />
          </button>
        </div>
      )}

      {/* Модалка деталей */}
      <Modal
        title={selectedProperty?.title}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={600}
        className={styles.detailModal}
      >
        {selectedProperty && (
          <div className={styles.detailContent}>
            <div className={styles.detailImage}>
              <HomeOutlined className={styles.detailPlaceholderIcon} />
            </div>

            <div className={styles.detailInfo}>
              <div className={styles.detailPrice}>
                {formatPrice(selectedProperty.price)}
              </div>

              <div className={styles.detailAddress}>
                <EnvironmentOutlined />
                <span>{selectedProperty.address || 'Адрес не указан'}</span>
              </div>

              <div className={styles.detailFeatures}>
                <div className={styles.detailFeature}>
                  <span className={styles.featureLabel}>Тип</span>
                  <span className={styles.featureValue}>
                    {PROPERTY_TYPE_LABELS[selectedProperty.propertyType]}
                  </span>
                </div>
                <div className={styles.detailFeature}>
                  <span className={styles.featureLabel}>Площадь</span>
                  <span className={styles.featureValue}>{selectedProperty.area} м²</span>
                </div>
                <div className={styles.detailFeature}>
                  <span className={styles.featureLabel}>Комнаты</span>
                  <span className={styles.featureValue}>{selectedProperty.rooms}</span>
                </div>
              </div>

              {selectedProperty.description && (
                <div className={styles.detailDescription}>
                  <h4>Описание</h4>
                  <p>{selectedProperty.description}</p>
                </div>
              )}
            </div>

            <div className={styles.detailActions}>
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={() => {
                  setDetailModalVisible(false);
                  handleSwipeLeft();
                }}
              >
                Пропустить
              </Button>
              <Button
                type="primary"
                icon={<HeartFilled />}
                onClick={() => {
                  setDetailModalVisible(false);
                  handleSwipeRight();
                }}
              >
                Нравится
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PropertyMatchingPage;

