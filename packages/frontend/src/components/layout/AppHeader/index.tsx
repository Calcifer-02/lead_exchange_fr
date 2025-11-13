import React, { useState, useRef, useEffect } from 'react';
import { Avatar, Badge, Button, Input, Space, Tooltip, List, Tag, Spin, Empty } from 'antd';
import { BellOutlined, MessageOutlined, MenuOutlined, SearchOutlined, HomeOutlined } from '@ant-design/icons';
import { useMLMatching } from '../../../hooks/useMLMatching';
import type { Requirements, Property } from '../../../types/ml';
import styles from './styles.module.css';

interface AppHeaderProps {
  onToggleSidebar?: () => void;
  showMenuTrigger?: boolean;
}

const AppHeader = ({ onToggleSidebar, showMenuTrigger = false }: AppHeaderProps) => {
  const [searchValue, setSearchValue] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { matches, loading, findMatches, similarityScores, getSimilarityPercentage } = useMLMatching();

  // Обработчик изменения поискового запроса
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
  };

  // Поиск с debounce
  useEffect(() => {
    const performSearch = async () => {
      if (searchValue.trim().length > 2) {
        const requirements: Requirements = parseSearchQuery(searchValue);
        await findMatches(requirements, 5);
        setShowResults(true);
      } else {
        setShowResults(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 500);
    return () => clearTimeout(timeoutId);
  }, [searchValue, findMatches]);

  // Парсинг поискового запроса в требования для ML
  const parseSearchQuery = (query: string): Requirements => {
    const requirements: Requirements = {
      districts: [], // ОБЯЗАТЕЛЬНО инициализируем массив
      min_price: 0,
      max_price: 999999999
    };

    const lowerQuery = query.toLowerCase();

    // Поиск по району - ОБЯЗАТЕЛЬНО массив строк
    const districts = ['центр', 'центральный', 'север', 'северный', 'юг', 'южный', 'восток', 'восточный', 'запад', 'западный', 'приморский', 'речной'];
    const foundDistricts = districts.filter(district => lowerQuery.includes(district));

    if (foundDistricts.length > 0) {
      requirements.districts = foundDistricts;
    } else {
      // Если не нашли конкретных районов, используем весь запрос как район
      requirements.districts = [query.trim()];
    }

    // Поиск по количеству комнат
    const roomMatch = query.match(/(\d+)\s*[кккомнаты]/);
    if (roomMatch) {
      requirements.rooms = parseInt(roomMatch[1]);
    }

    // Поиск по цене (например: "5т" = 5,000,000)
    const priceMatch = query.match(/(\d+)\s*[тт]/);
    if (priceMatch) {
      const price = parseInt(priceMatch[1]) * 1000000;
      requirements.max_price = price;
    }

    // Поиск по площади
    const areaMatch = query.match(/(\d+)\s*[мм²]/);
    if (areaMatch) {
      requirements.min_area = parseInt(areaMatch[1]);
    }

    console.log('🔍 Parsed requirements:', requirements);
    return requirements;
  };
  // Обработчик очистки поиска
  const handleSearchClear = () => {
    setSearchValue('');
    setShowResults(false);
  };

  // Закрытие результатов при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Обработчик выбора результата
  const handleResultSelect = (property: Property) => {
    console.log('Selected property:', property);
    setShowResults(false);
    setSearchValue('');
    // Здесь можно добавить навигацию к объекту
  };

  // Обработчик отправки поиска
  const handleSearchSubmit = () => {
    if (searchValue.trim().length > 2) {
      const requirements: Requirements = parseSearchQuery(searchValue);
      findMatches(requirements, 5);
      setShowResults(true);
    }
  };

  return (
    <div className={styles.header}>
      {showMenuTrigger && (
        <Button
          type="text"
          shape="circle"
          icon={<MenuOutlined />}
          onClick={onToggleSidebar}
          className={styles.menuButton}
          aria-label="Открыть меню"
        />
      )}

      <div className={styles.searchWrapper} ref={searchRef}>
        <Input
          allowClear
          value={searchValue}
          placeholder="AI поиск: '2к центр', '3 комнаты север', 'квартира 5т'..."
          prefix={<SearchOutlined style={{ color: '#4567A1' }} />}
          onChange={handleSearchChange}
          onPressEnter={handleSearchSubmit}
          onClear={handleSearchClear}
          className={styles.searchInput}
        />

        {/* Результаты ML поиска */}
        {showResults && (
          <div className={styles.mlResultsContainer}>
            {loading ? (
              <div className={styles.loadingContainer}>
                <Spin size="small" />
                <span>AI ищет лучшие варианты...</span>
              </div>
            ) : matches.length > 0 ? (
              <List
                className={styles.resultsList}
                dataSource={matches}
                renderItem={(property, index) => (
                  <List.Item
                    className={styles.resultItem}
                    onClick={() => handleResultSelect(property)}
                  >
                    <List.Item.Meta
                      avatar={
                        <div className={styles.propertyAvatar}>
                          <HomeOutlined />
                          {similarityScores[index] && (
                            <div className={styles.similarityBadge}>
                              {getSimilarityPercentage(similarityScores[index])}%
                            </div>
                          )}
                        </div>
                      }
                      title={
                        <div className={styles.propertyTitle}>
                          <span>{property.district}</span>
                          <Tag color="blue">{property.rooms}к</Tag>
                        </div>
                      }
                      description={
                        <div className={styles.propertyDetails}>
                          <div className={styles.price}>
                            {property.price.toLocaleString('ru-RU')} ₽
                          </div>
                          <div className={styles.specs}>
                            {property.area} м² • {property.floor}/{property.total_floors} эт.
                          </div>
                          <div className={styles.features}>
                            {property.has_balcony && <Tag>Балкон</Tag>}
                            {property.has_parking && <Tag>Парковка</Tag>}
                            {property.has_elevator && <Tag>Лифт</Tag>}
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : searchValue.trim().length > 2 ? (
              <div className={styles.noResults}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Ничего не найдено"
                />
              </div>
            ) : null}
          </div>
        )}
      </div>

      <Space size={16} className={styles.actions}>
        <Tooltip title="Уведомления">
          <Badge dot offset={[-2, 2]}>
            <Button type="text" shape="circle" icon={<BellOutlined />} className={styles.iconButton} />
          </Badge>
        </Tooltip>
        <Tooltip title="Сообщения">
          <Badge dot offset={[-2, 2]}>
            <Button type="text" shape="circle" icon={<MessageOutlined />} className={styles.iconButton} />
          </Badge>
        </Tooltip>
        <Avatar size={40} className={styles.avatar}>
          АП
        </Avatar>
      </Space>
    </div>
  );
};

export default AppHeader;