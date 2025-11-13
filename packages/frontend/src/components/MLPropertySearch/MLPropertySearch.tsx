import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Checkbox,
  Space,
  Alert,

} from 'antd';
import { RocketOutlined } from '@ant-design/icons';
import { useMLMatching } from '../../hooks/useMLMatching';
import type { Requirements, Property } from '../../types/ml';
import styles from './MLPropertySearch.module.css';

const { Option } = Select;

interface FormValues {
  districts?: string[];
  rooms?: number;
  min_price?: number;
  max_price?: number;
  min_rooms?: number;
  max_rooms?: number;
  min_area?: number;
  max_area?: number;
  property_type?: 'apartment' | 'house' | 'commercial';
  renovation?: 'none' | 'cosmetic' | 'designer' | 'euro' | undefined;
  has_balcony?: boolean;
  has_parking?: boolean;
  has_elevator?: boolean;
}

export const MLPropertySearch: React.FC = () => {
  const [form] = Form.useForm();
  const { matches, loading, error, findMatches, similarityScores, getSimilarityPercentage } = useMLMatching();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const districts = [
    'Центральный', 'Северный', 'Южный', 'Восточный', 'Западный',
    'Приморский', 'Речной', 'Загородный', 'Исторический'
  ];

  const onFinish = async (values: FormValues) => {
    const requirements: Requirements = {
      min_price: values.min_price || 0,
      max_price: values.max_price || 999999999,
      districts: values.districts,
      rooms: values.rooms,
      min_rooms: values.min_rooms,
      max_rooms: values.max_rooms,
      min_area: values.min_area,
      max_area: values.max_area,
      property_type: values.property_type,
      renovation: values.renovation,
      has_balcony: values.has_balcony,
      has_parking: values.has_parking,
      has_elevator: values.has_elevator,
    };

    await findMatches(requirements, 10);
  };

  return (
    <div className={styles.container}>
      <Card
        title={
          <Space>
            <RocketOutlined style={{ color: '#1890ff' }} />
            AI-подбор недвижимости
          </Space>
        }
        className={styles.searchCard}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          className={styles.searchForm}
        >
          {/* Основные поля */}
          <div className={styles.formRow}>
            <Form.Item label="Районы" name="districts">
              <Select mode="multiple" placeholder="Выберите районы">
                {districts.map(district => (
                  <Option key={district} value={district}>{district}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item label="Комнат" name="rooms">
              <Select placeholder="Точное количество">
                <Option value={1}>1</Option>
                <Option value={2}>2</Option>
                <Option value={3}>3</Option>
                <Option value={4}>4+</Option>
              </Select>
            </Form.Item>
          </div>

          <div className={styles.formRow}>
            <Form.Item label="Цена от" name="min_price">
              <Input type="number" placeholder="0" addonAfter="₽" />
            </Form.Item>

            <Form.Item label="Цена до" name="max_price">
              <Input type="number" placeholder="999999999" addonAfter="₽" />
            </Form.Item>
          </div>

          {/* Расширенные настройки */}
          <Button
            type="link"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={styles.advancedToggle}
          >
            {showAdvanced ? 'Скрыть' : 'Расширенные настройки'}
          </Button>

          {showAdvanced && (
            <div className={styles.advancedSection}>
              <div className={styles.formRow}>
                <Form.Item label="Тип недвижимости" name="property_type">
                  <Select placeholder="Любой">
                    <Option value="apartment">Квартира</Option>
                    <Option value="house">Дом</Option>
                    <Option value="commercial">Коммерческая</Option>
                  </Select>
                </Form.Item>

                <Form.Item label="Ремонт" name="renovation">
                  <Select placeholder="Любой">
                    <Option value="none">Без ремонта</Option>
                    <Option value="cosmetic">Косметический</Option>
                    <Option value="euro">Евроремонт</Option>
                    <Option value="designer">Дизайнерский</Option>
                  </Select>
                </Form.Item>
              </div>

              <div className={styles.checkboxGroup}>
                <Form.Item name="has_balcony" valuePropName="checked">
                  <Checkbox>Балкон/лоджия</Checkbox>
                </Form.Item>
                <Form.Item name="has_parking" valuePropName="checked">
                  <Checkbox>Парковка</Checkbox>
                </Form.Item>
                <Form.Item name="has_elevator" valuePropName="checked">
                  <Checkbox>Лифт</Checkbox>
                </Form.Item>
              </div>
            </div>
          )}

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<RocketOutlined />}
              loading={loading}
              size="large"
              className={styles.searchButton}
            >
              Найти AI-матчи
            </Button>
          </Form.Item>
        </Form>

        {error && (
          <Alert message={error} type="error" showIcon className={styles.alert} />
        )}
      </Card>

      {/* Результаты поиска */}
      {matches.length > 0 && (
        <Card title={`Найдено совпадений: ${matches.length}`} className={styles.resultsCard}>
          <div className={styles.resultsGrid}>
            {matches.map((property, index) => (
              <PropertyCard
                key={property.id || index}
                property={property}
                similarity={similarityScores[index] ? getSimilarityPercentage(similarityScores[index]) : undefined}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

// Компонент карточки объекта
const PropertyCard: React.FC<{ property: Property; similarity?: number }> = ({ property, similarity }) => {
  return (
    <Card size="small" className={styles.propertyCard}>
      <div className={styles.propertyHeader}>
        <h3>{property.district}</h3>
        {similarity && (
          <div className={styles.similarityBadge}>
            {similarity}% совпадение
          </div>
        )}
      </div>

      <div className={styles.propertyDetails}>
        <div className={styles.price}>{property.price.toLocaleString('ru-RU')} ₽</div>
        <div className={styles.specs}>
          {property.rooms} комн. • {property.area} м² • {property.floor}/{property.total_floors} эт.
        </div>
        <div className={styles.features}>
          {property.has_balcony && <span>Балкон</span>}
          {property.has_parking && <span>Парковка</span>}
          {property.has_elevator && <span>Лифт</span>}
        </div>
      </div>
    </Card>
  );
};