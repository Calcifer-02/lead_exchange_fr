import { useMemo, useState } from 'react';
import {
  AppstoreOutlined,
  EyeOutlined,
  FilterOutlined,
  MoreOutlined,
  OrderedListOutlined,
  PlusOutlined,
  SearchOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { Button, Input, Segmented, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import styles from './styles.module.css';

type Status = 'active' | 'hidden';

interface Listing {
  key: string;
  title: string;
  status: Status;
  price: string;
  rooms: number;
  updatedAt: string;
}

const { Title, Text } = Typography;

// Mock data - в будущем заменить на API
const LISTINGS: Listing[] = [
  { key: '1', title: 'Москва, Квартира, ул. Ленина, 1', status: 'active', price: '15 000 000 ₽', rooms: 3, updatedAt: '15.08.2023' },
  { key: '2', title: 'Санкт-Петербург, Дом, пр. Невский, 25', status: 'active', price: '32 500 000 ₽', rooms: 5, updatedAt: '14.08.2023' },
  { key: '3', title: 'Екатеринбург, Апартаменты, ул. Малышева, 51', status: 'hidden', price: '8 200 000 ₽', rooms: 1, updatedAt: '12.08.2023' },
  { key: '4', title: 'Москва, Квартира, ул. Тверская, 10', status: 'active', price: '21 000 000 ₽', rooms: 2, updatedAt: '11.08.2023' },
];

const STATUS_META: Record<Status, { text: string; color: string; background: string }> = {
  active: { text: 'Активен', color: '#166534', background: '#DCFCE7' },
  hidden: { text: 'Скрыт', color: '#1F2937', background: '#F3F4F6' },
};

const MyObjectsPage = () => {
  const [view, setView] = useState<'list' | 'grid'>('list');
  const navigate = useNavigate();

  const columns = useMemo<ColumnsType<Listing>>(
    () => [
      {
        title: 'Заголовок',
        dataIndex: 'title',
        key: 'title',
        width: 360,
        render: (value: Listing['title']) => <Text strong>{value}</Text>,
      },
      {
        title: 'Статус',
        dataIndex: 'status',
        key: 'status',
        width: 160,
        render: (value: Listing['status']) => {
          const statusClass = value === 'active' ? styles.statusActive : styles.statusHidden;
          return (
            <Tag className={`${styles.statusTag} ${statusClass}`}>
              {STATUS_META[value].text}
            </Tag>
          );
        },
      },
      {
        title: 'Цена/бюджет',
        dataIndex: 'price',
        key: 'price',
        width: 180,
        render: (value: Listing['price']) => <Text type="secondary">{value}</Text>,
      },
      {
        title: 'Комнаты',
        dataIndex: 'rooms',
        key: 'rooms',
        width: 120,
        render: (value: Listing['rooms']) => <Text type="secondary">{value}</Text>,
      },
      {
        title: 'Дата обновления',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 180,
        render: (value: Listing['updatedAt']) => <Text type="secondary">{value}</Text>,
      },
      {
        key: 'actions',
        width: 72,
        align: 'right',
        render: () => (
          <Tooltip title="Дополнительно">
            <Button type="text" size="small" icon={<MoreOutlined />} className={styles.tableActionButton} />
          </Tooltip>
        ),
      },
    ],
    [],
  );

  const handleCreateNew = () => {
    navigate('/my-objects/new');
  };

  const handleShowCollections = () => {
    // TODO: Реализовать показ сохраненных подборок
    console.log('Show collections');
  };

  const handleShowViews = () => {
    // TODO: Реализовать показ просмотров
    console.log('Show views');
  };

  const handleShowFilters = () => {
    // TODO: Реализовать показ фильтров
    console.log('Show filters');
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <Title level={2} className={styles.pageTitle}>
          Мои объекты
        </Title>
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          className={styles.pageHeaderAction}
          onClick={handleCreateNew}
        >
          Создать новый объект
        </Button>
      </header>

      <div className={styles.filtersBar}>
        <div className={styles.search}>
          <Input
            allowClear
            prefix={<SearchOutlined className={styles.searchIcon} />}
            placeholder="Поиск по адресу или городу..."
            size="large"
          />
        </div>

        <div className={styles.controls}>
          <Tooltip title={view === 'list' ? 'Показать плиткой' : 'Показать списком'}>
            <Segmented
              size="middle"
              value={view}
              onChange={(value) => setView(value as 'list' | 'grid')}
              className={styles.viewToggle}
              options={[
                { label: <TableOutlined />, value: 'list' },
                { label: <AppstoreOutlined />, value: 'grid' },
              ]}
            />
          </Tooltip>
          <Tooltip title="Сохранённые подборки">
            <Button icon={<OrderedListOutlined />} className={styles.iconButton} onClick={handleShowCollections} />
          </Tooltip>
          <Tooltip title="Просмотры">
            <Button icon={<EyeOutlined />} className={styles.iconButton} onClick={handleShowViews} />
          </Tooltip>
        </div>

        <Button icon={<FilterOutlined />} className={styles.filtersActionButton} onClick={handleShowFilters}>
          Фильтры
        </Button>
      </div>

      <div className={styles.tableCard}>
        <Table<Listing>
          columns={columns}
          dataSource={LISTINGS}
          pagination={false}
          rowKey="key"
          scroll={{ x: 900 }}
        />
      </div>
    </div>
  );
};

export default MyObjectsPage;

