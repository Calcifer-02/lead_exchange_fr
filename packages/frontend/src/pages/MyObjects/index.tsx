import { useEffect, useMemo, useState } from 'react';
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
import { Button, Input, Segmented, Table, Tag, Tooltip, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { leadsAPI } from '../../api';
import type { Lead, LeadStatus } from '../../types/leads';
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from '../../types/leads';
import styles from './styles.module.css';

const { Title, Text } = Typography;


const MyObjectsPage = () => {
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Загружаем лиды пользователя при монтировании
  useEffect(() => {
    const loadLeads = async () => {
      try {
        setLoading(true);
        // Получаем userId из localStorage (предполагаем что он там сохранен)
        const userId = localStorage.getItem('userId');
        if (!userId) {
          console.warn('User ID not found, redirecting to auth');
          navigate('/auth');
          return;
        }

        // Загружаем лиды созданные пользователем
        const response = await leadsAPI.listLeads({
          createdUserId: userId,
        });

        setLeads(response.leads);
      } catch (error) {
        console.error('Failed to load leads:', error);
        message.error('Не удалось загрузить список объектов');
      } finally {
        setLoading(false);
      }
    };

    loadLeads();
  }, [navigate]);

  const columns = useMemo<ColumnsType<Lead>>(
    () => [
      {
        title: 'Заголовок',
        dataIndex: 'title',
        key: 'title',
        width: 360,
        render: (value: string) => <Text strong>{value}</Text>,
      },
      {
        title: 'Статус',
        dataIndex: 'status',
        key: 'status',
        width: 160,
        render: (value: LeadStatus) => {
          const colors = LEAD_STATUS_COLORS[value];
          return (
            <Tag
              className={styles.statusTag}
              style={{
                color: colors.text,
                background: colors.bg,
                borderColor: colors.border,
              }}
            >
              {LEAD_STATUS_LABELS[value]}
            </Tag>
          );
        },
      },
      {
        title: 'Контакт',
        dataIndex: 'contactName',
        key: 'contactName',
        width: 200,
        render: (value: string, record: Lead) => (
          <div>
            <Text strong>{value}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.contactPhone}
            </Text>
          </div>
        ),
      },
      {
        title: 'Дата создания',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 180,
        render: (value: string) => {
          const date = new Date(value);
          return <Text type="secondary">{date.toLocaleDateString('ru-RU')}</Text>;
        },
      },
      {
        key: 'actions',
        width: 72,
        align: 'right',
        render: (_, record: Lead) => (
          <Tooltip title="Дополнительно">
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              className={styles.tableActionButton}
              onClick={() => handleLeadActions(record)}
            />
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

  const handleLeadActions = (lead: Lead) => {
    // TODO: Реализовать меню действий с лидом (редактировать, удалить, etc.)
    console.log('Lead actions for:', lead.title, lead.leadId);
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <Title level={2} className={styles.pageTitle}>
          Мои объекты ({leads.length})
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
        <Table<Lead>
          columns={columns}
          dataSource={leads}
          loading={loading}
          pagination={false}
          rowKey="leadId"
          scroll={{ x: 900 }}
          locale={{
            emptyText: loading ? 'Загрузка...' : 'У вас пока нет объектов',
          }}
        />
      </div>
    </div>
  );
};

export default MyObjectsPage;
