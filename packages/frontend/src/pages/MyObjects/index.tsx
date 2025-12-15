import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  AppstoreOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FilterOutlined,
  HeartOutlined,
  HomeOutlined,
  MoreOutlined,
  OrderedListOutlined,
  SearchOutlined,
  TableOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import {
  Button,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
  Popconfirm,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import { leadsAPI, propertiesAPI } from '../../api';
import type { Lead, LeadStatus, Property, PropertyStatus, PropertyType } from '../../types';
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, PROPERTY_STATUS_LABELS, PROPERTY_TYPE_LABELS } from '../../types';
import styles from './styles.module.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

type TabType = 'leads' | 'properties';

interface EditFormValues {
  title: string;
  description: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}

interface EditPropertyFormValues {
  title: string;
  description: string;
  address: string;
  price: number;
  area: number;
  rooms: number;
  propertyType: PropertyType;
}

// Цвета для статусов объектов
const PROPERTY_STATUS_COLORS: Record<PropertyStatus, { text: string; bg: string; border: string }> = {
  PROPERTY_STATUS_UNSPECIFIED: { text: '#8c8c8c', bg: '#fafafa', border: '#d9d9d9' },
  PROPERTY_STATUS_NEW: { text: '#1890ff', bg: '#e6f7ff', border: '#91d5ff' },
  PROPERTY_STATUS_PUBLISHED: { text: '#52c41a', bg: '#f6ffed', border: '#b7eb8f' },
  PROPERTY_STATUS_SOLD: { text: '#722ed1', bg: '#f9f0ff', border: '#d3adf7' },
  PROPERTY_STATUS_DELETED: { text: '#ff4d4f', bg: '#fff1f0', border: '#ffa39e' },
};

const MyObjectsPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>('leads');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [form] = Form.useForm<EditFormValues>();

  // Состояния для редактирования объекта
  const [editPropertyModalVisible, setEditPropertyModalVisible] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [editPropertyLoading, setEditPropertyLoading] = useState(false);
  const [propertyForm] = Form.useForm<EditPropertyFormValues>();

  const navigate = useNavigate();

  // Мемоизируем отфильтрованные лиды для оптимизации
  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return leads;

    const query = searchQuery.toLowerCase();
    return leads.filter(lead =>
      lead.title.toLowerCase().includes(query) ||
      lead.description?.toLowerCase().includes(query) ||
      lead.contactName.toLowerCase().includes(query)
    );
  }, [leads, searchQuery]);

  // Мемоизируем отфильтрованные объекты
  const filteredProperties = useMemo(() => {
    if (!searchQuery.trim()) return properties;

    const query = searchQuery.toLowerCase();
    return properties.filter(property =>
      property.title.toLowerCase().includes(query) ||
      property.description?.toLowerCase().includes(query) ||
      property.address?.toLowerCase().includes(query)
    );
  }, [properties, searchQuery]);

  // Загрузка лидов
  const loadLeads = useCallback(async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        return;
      }

      const response = await leadsAPI.listLeads({
        createdUserId: userId,
      });

      setLeads(response.leads);
    } catch {
      message.error('Не удалось загрузить список лидов');
    }
  }, []);

  // Загрузка объектов недвижимости
  const loadProperties = useCallback(async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        return;
      }

      const propertiesList = await propertiesAPI.getProperties({
        createdUserId: userId,
      });

      setProperties(propertiesList);
    } catch {
      message.error('Не удалось загрузить список объектов');
    }
  }, []);

  // Загружаем данные при монтировании и смене вкладки
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const userId = localStorage.getItem('userId');

      if (!userId) {
        message.error('Не удалось определить ID пользователя. Попробуйте выйти и войти снова.');
        setLoading(false);
        return;
      }

      await Promise.all([loadLeads(), loadProperties()]);
      setLoading(false);
    };

    loadData();
  }, [loadLeads, loadProperties]);

  // Открыть модалку редактирования
  const handleEdit = useCallback((lead: Lead) => {
    setEditingLead(lead);
    form.setFieldsValue({
      title: lead.title,
      description: lead.description,
      contactName: lead.contactName,
      contactPhone: lead.contactPhone,
      contactEmail: lead.contactEmail,
    });
    setEditModalVisible(true);
  }, [form]);

  // Сохранить изменения лида
  const handleSaveEdit = async (values: EditFormValues) => {
    if (!editingLead) return;

    try {
      setEditLoading(true);
      await leadsAPI.updateLead(editingLead.leadId, {
        title: values.title,
        description: values.description,
      });
      message.success('Лид успешно обновлён');
      setEditModalVisible(false);
      setEditingLead(null);
      form.resetFields();
      // Перезагружаем список
      await loadLeads();
    } catch {
      message.error('Не удалось обновить лид');
    } finally {
      setEditLoading(false);
    }
  };

  // Удалить лид (установить статус DELETED)
  const handleDelete = useCallback(async (lead: Lead) => {
    try {
      setDeleteLoading(lead.leadId);
      await leadsAPI.updateLead(lead.leadId, {
        status: 'LEAD_STATUS_DELETED',
      });
      message.success('Лид успешно удалён');
      // Перезагружаем список
      await loadLeads();
    } catch {
      message.error('Не удалось удалить лид');
    } finally {
      setDeleteLoading(null);
    }
  }, [loadLeads]);

  // Открыть модалку редактирования объекта
  const handleEditProperty = useCallback((property: Property) => {
    setEditingProperty(property);
    propertyForm.setFieldsValue({
      title: property.title,
      description: property.description || '',
      address: property.address || '',
      price: Number(property.price) || 0,
      area: property.area || 0,
      rooms: property.rooms || 0,
      propertyType: property.propertyType,
    });
    setEditPropertyModalVisible(true);
  }, [propertyForm]);

  // Сохранить изменения объекта
  const handleSavePropertyEdit = async (values: EditPropertyFormValues) => {
    if (!editingProperty) return;

    try {
      setEditPropertyLoading(true);
      await propertiesAPI.updateProperty(editingProperty.propertyId, {
        title: values.title,
        description: values.description,
        address: values.address,
        price: values.price.toString(),
        area: values.area,
        rooms: values.rooms,
        propertyType: values.propertyType,
      });
      message.success('Объект успешно обновлён');
      setEditPropertyModalVisible(false);
      setEditingProperty(null);
      propertyForm.resetFields();
      // Перезагружаем список
      await loadProperties();
    } catch {
      message.error('Не удалось обновить объект');
    } finally {
      setEditPropertyLoading(false);
    }
  };

  // Удалить объект (установить статус DELETED)
  const handleDeleteProperty = useCallback(async (property: Property) => {
    try {
      setDeleteLoading(property.propertyId);
      await propertiesAPI.updateProperty(property.propertyId, {
        status: 'PROPERTY_STATUS_DELETED',
      });
      message.success('Объект успешно удалён');
      // Перезагружаем список
      await loadProperties();
    } catch {
      message.error('Не удалось удалить объект');
    } finally {
      setDeleteLoading(null);
    }
  }, [loadProperties]);

  // Просмотр лида
  const handleView = useCallback((lead: Lead) => {
    navigate(`/leads-catalog/${lead.leadId}`);
  }, [navigate]);

  // Меню действий для лида
  const getActionsMenu = useCallback((lead: Lead): MenuProps['items'] => [
    {
      key: 'view',
      icon: <EyeOutlined />,
      label: 'Просмотреть',
      onClick: (info) => {
        info.domEvent.stopPropagation();
        handleView(lead);
      },
    },
    {
      key: 'matching',
      icon: <HeartOutlined />,
      label: 'Подобрать объекты',
      onClick: (info) => {
        info.domEvent.stopPropagation();
        navigate(`/leads/${lead.leadId}/matching`);
      },
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Редактировать',
      onClick: (info) => {
        info.domEvent.stopPropagation();
        handleEdit(lead);
      },
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Удалить',
      danger: true,
      onClick: (info) => {
        info.domEvent.stopPropagation();
        Modal.confirm({
          title: 'Удалить лид?',
          content: `Вы уверены, что хотите удалить "${lead.title}"? Это действие нельзя отменить.`,
          okText: 'Удалить',
          okType: 'danger',
          cancelText: 'Отмена',
          onOk: () => handleDelete(lead),
        });
      },
    },
  ], [handleView, handleEdit, handleDelete, navigate]);

  // Меню действий для объекта недвижимости
  const getPropertyActionsMenu = useCallback((property: Property): MenuProps['items'] => [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Редактировать',
      onClick: (info) => {
        info.domEvent.stopPropagation();
        handleEditProperty(property);
      },
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Удалить',
      danger: true,
      onClick: (info) => {
        info.domEvent.stopPropagation();
        Modal.confirm({
          title: 'Удалить объект?',
          content: `Вы уверены, что хотите удалить "${property.title}"? Это действие нельзя отменить.`,
          okText: 'Удалить',
          okType: 'danger',
          cancelText: 'Отмена',
          onOk: () => handleDeleteProperty(property),
        });
      },
    },
  ], [handleEditProperty, handleDeleteProperty]);

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
        width: 120,
        align: 'right',
        render: (_, record: Lead) => (
          <Space size="small">
            <Tooltip title="Редактировать">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(record);
                }}
              />
            </Tooltip>
            <Popconfirm
              title="Удалить лид?"
              description={`Вы уверены, что хотите удалить "${record.title}"?`}
              onConfirm={(e) => {
                e?.stopPropagation();
                handleDelete(record);
              }}
              onCancel={(e) => e?.stopPropagation()}
              okText="Удалить"
              cancelText="Отмена"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Удалить">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  loading={deleteLoading === record.leadId}
                  onClick={(e) => e.stopPropagation()}
                />
              </Tooltip>
            </Popconfirm>
            <Dropdown menu={{ items: getActionsMenu(record) }} trigger={['click']}>
              <Tooltip title="Ещё">
                <Button
                  type="text"
                  size="small"
                  icon={<MoreOutlined />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Tooltip>
            </Dropdown>
          </Space>
        ),
      },
    ],
    [handleEdit, handleDelete, deleteLoading, getActionsMenu],
  );


  const handleShowCollections = () => {
    // TODO: Реализовать показ сохраненных подборок
  };

  const handleShowViews = () => {
    // TODO: Реализовать показ просмотров
  };

  const handleShowFilters = () => {
    // TODO: Реализовать показ фильтров
  };

  const handleLeadClick = (lead: Lead) => {
    // Переходим на детальную страницу лида
    navigate(`/leads-catalog/${lead.leadId}`);
  };

  // Рендер карточки для grid view
  const renderLeadCard = (lead: Lead) => {
    const colors = LEAD_STATUS_COLORS[lead.status];
    const createdDate = new Date(lead.createdAt).toLocaleDateString('ru-RU');

    return (
      <div
        key={lead.leadId}
        className={styles.leadCard}
        onClick={() => handleLeadClick(lead)}
      >
        <div className={styles.leadCardHeader}>
          <Tag
            style={{
              color: colors.text,
              background: colors.bg,
              borderColor: colors.border,
              margin: 0,
            }}
          >
            {LEAD_STATUS_LABELS[lead.status]}
          </Tag>
          <Dropdown
            menu={{ items: getActionsMenu(lead) }}
            trigger={['click']}
          >
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        </div>

        <div className={styles.leadCardBody}>
          <Text strong className={styles.leadCardTitle}>
            {lead.title}
          </Text>
          {lead.description && (
            <Text type="secondary" className={styles.leadCardDescription}>
              {lead.description.length > 100
                ? `${lead.description.slice(0, 100)}...`
                : lead.description}
            </Text>
          )}
        </div>

        <div className={styles.leadCardFooter}>
          <div className={styles.leadCardContact}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {lead.contactName}
            </Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {lead.contactPhone}
            </Text>
          </div>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {createdDate}
          </Text>
        </div>

        <div className={styles.leadCardActions}>
          <Tooltip title="Редактировать">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(lead);
              }}
            />
          </Tooltip>
          <Tooltip title="Удалить">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={deleteLoading === lead.leadId}
              onClick={(e) => {
                e.stopPropagation();
                Modal.confirm({
                  title: 'Удалить лид?',
                  content: `Вы уверены, что хотите удалить "${lead.title}"?`,
                  okText: 'Удалить',
                  okType: 'danger',
                  cancelText: 'Отмена',
                  onOk: () => handleDelete(lead),
                });
              }}
            />
          </Tooltip>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <Title level={2} className={styles.pageTitle}>
          Мои объекты ({activeTab === 'leads' ? leads.length : properties.length})
        </Title>
        <Space>
          {activeTab === 'leads' ? (
            <Button
              type="primary"
              size="large"
              icon={<UserAddOutlined />}
              className={styles.pageHeaderAction}
              onClick={() => navigate('/leads/new')}
            >
              Создать лид
            </Button>
          ) : (
            <Button
              type="primary"
              size="large"
              icon={<HomeOutlined />}
              className={styles.pageHeaderAction}
              onClick={() => navigate('/properties/new')}
            >
              Создать объект
            </Button>
          )}
        </Space>
      </header>

      <div className={styles.filtersBar}>
        <div className={styles.search}>
          <Input
            allowClear
            prefix={<SearchOutlined className={styles.searchIcon} />}
            placeholder={activeTab === 'leads'
              ? "Поиск по названию, контакту или описанию..."
              : "Поиск по названию, адресу или описанию..."}
            size="large"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TabType)}
        className={styles.tabs}
        items={[
          {
            key: 'leads',
            label: 'Лиды',
            children: (
              view === 'list' ? (
                <div className={styles.tableCard}>
                  <Table<Lead>
                    columns={columns}
                    dataSource={filteredLeads}
                    loading={loading}
                    pagination={{
                      pageSize: 20,
                      showSizeChanger: true,
                      pageSizeOptions: ['10', '20', '50', '100'],
                      showTotal: (total) => `Всего: ${total}`,
                    }}
                    rowKey="leadId"
                    scroll={{ x: 900 }}
                    locale={{
                      emptyText: loading ? 'Загрузка...' : 'У вас пока нет объектов',
                    }}
                    onRow={(record) => ({
                      onClick: () => handleLeadClick(record),
                      style: { cursor: 'pointer' },
                    })}
                    rowClassName={styles.tableRow}
                  />
                </div>
              ) : (
                <div className={styles.gridContainer}>
                  {loading ? (
                    <div className={styles.loadingPlaceholder}>Загрузка...</div>
                  ) : filteredLeads.length === 0 ? (
                    <div className={styles.emptyPlaceholder}>У вас пока нет объектов</div>
                  ) : (
                    filteredLeads.map(renderLeadCard)
                  )}
                </div>
              )
            ),
          },
          {
            key: 'properties',
            label: 'Объекты',
            children: (
              <div className={styles.gridContainer}>
                {loading ? (
                  <div className={styles.loadingPlaceholder}>Загрузка...</div>
                ) : filteredProperties.length === 0 ? (
                  <div className={styles.emptyPlaceholder}>У вас пока нет объектов</div>
                ) : (
                  filteredProperties.map((property) => (
                    <div key={property.propertyId} className={styles.propertyCard}>
                      <div className={styles.propertyCardHeader}>
                        <Tag
                          style={{
                            color: PROPERTY_STATUS_COLORS[property.status].text,
                            background: PROPERTY_STATUS_COLORS[property.status].bg,
                            borderColor: PROPERTY_STATUS_COLORS[property.status].border,
                            margin: 0,
                          }}
                        >
                          {PROPERTY_STATUS_LABELS[property.status]}
                        </Tag>
                        <Dropdown
                          menu={{ items: getPropertyActionsMenu(property) }}
                          trigger={['click']}
                        >
                          <Button
                            type="text"
                            size="small"
                            icon={<MoreOutlined />}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Dropdown>
                      </div>

                      <div className={styles.propertyCardBody}>
                        <Text strong className={styles.propertyCardTitle}>
                          {property.title}
                        </Text>
                        {property.description && (
                          <Text type="secondary" className={styles.propertyCardDescription}>
                            {property.description.length > 100
                              ? `${property.description.slice(0, 100)}...`
                              : property.description}
                          </Text>
                        )}
                      </div>

                      <div className={styles.propertyCardFooter}>
                        <div className={styles.propertyCardContact}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {property.address}
                          </Text>
                        </div>
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {new Date(property.createdAt).toLocaleDateString('ru-RU')}
                        </Text>
                      </div>

                      <div className={styles.propertyCardActions}>
                        <Tooltip title="Редактировать">
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditProperty(property);
                            }}
                          />
                        </Tooltip>
                        <Tooltip title="Удалить">
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            loading={deleteLoading === property.propertyId}
                            onClick={(e) => {
                              e.stopPropagation();
                              Modal.confirm({
                                title: 'Удалить объект?',
                                content: `Вы уверены, что хотите удалить "${property.title}"?`,
                                okText: 'Удалить',
                                okType: 'danger',
                                cancelText: 'Отмена',
                                onOk: () => handleDeleteProperty(property),
                              });
                            }}
                          />
                        </Tooltip>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ),
          },
        ]}
      />

      {/* Модальное окно редактирования лида */}
      <Modal
        title="Редактирование лида"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingLead(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveEdit}
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="title"
            label="Заголовок"
            rules={[
              { required: true, message: 'Введите заголовок' },
              { min: 3, message: 'Минимум 3 символа' },
            ]}
          >
            <Input placeholder="Название лида" size="large" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
            rules={[{ required: true, message: 'Введите описание' }]}
          >
            <TextArea
              placeholder="Описание лида"
              rows={4}
              showCount
              maxLength={1000}
            />
          </Form.Item>

          <Form.Item
            name="contactName"
            label="Контактное лицо"
          >
            <Input placeholder="Имя контактного лица" disabled />
          </Form.Item>

          <Form.Item
            name="contactPhone"
            label="Телефон"
          >
            <Input placeholder="Телефон" disabled />
          </Form.Item>

          <Form.Item
            name="contactEmail"
            label="Email"
          >
            <Input placeholder="Email" disabled />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setEditModalVisible(false);
                  setEditingLead(null);
                  form.resetFields();
                }}
              >
                Отмена
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={editLoading}
              >
                Сохранить
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно редактирования объекта */}
      <Modal
        title="Редактирование объекта недвижимости"
        open={editPropertyModalVisible}
        onCancel={() => {
          setEditPropertyModalVisible(false);
          setEditingProperty(null);
          propertyForm.resetFields();
        }}
        footer={null}
        width={700}
        destroyOnHidden
      >
        <Form
          form={propertyForm}
          layout="vertical"
          onFinish={handleSavePropertyEdit}
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="title"
            label="Название"
            rules={[
              { required: true, message: 'Введите название' },
              { min: 3, message: 'Минимум 3 символа' },
            ]}
          >
            <Input placeholder="Название объекта" size="large" />
          </Form.Item>

          <Form.Item
            name="propertyType"
            label="Тип объекта"
            rules={[{ required: true, message: 'Выберите тип объекта' }]}
          >
            <Select placeholder="Выберите тип" size="large">
              <Select.Option value="PROPERTY_TYPE_APARTMENT">
                {PROPERTY_TYPE_LABELS.PROPERTY_TYPE_APARTMENT}
              </Select.Option>
              <Select.Option value="PROPERTY_TYPE_HOUSE">
                {PROPERTY_TYPE_LABELS.PROPERTY_TYPE_HOUSE}
              </Select.Option>
              <Select.Option value="PROPERTY_TYPE_COMMERCIAL">
                {PROPERTY_TYPE_LABELS.PROPERTY_TYPE_COMMERCIAL}
              </Select.Option>
              <Select.Option value="PROPERTY_TYPE_LAND">
                {PROPERTY_TYPE_LABELS.PROPERTY_TYPE_LAND}
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <TextArea
              placeholder="Описание объекта"
              rows={4}
              showCount
              maxLength={2000}
            />
          </Form.Item>

          <Form.Item
            name="address"
            label="Адрес"
            rules={[{ required: true, message: 'Введите адрес' }]}
          >
            <Input placeholder="Адрес объекта" size="large" />
          </Form.Item>

          <Space size="large" style={{ display: 'flex', flexWrap: 'wrap' }}>
            <Form.Item
              name="price"
              label="Цена (₽)"
              rules={[{ required: true, message: 'Укажите цену' }]}
              style={{ marginBottom: 16 }}
            >
              <InputNumber
                placeholder="Цена"
                size="large"
                style={{ width: 180 }}
                min={0}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                parser={(value) => {
                  const parsed = Number(value?.replace(/\s/g, '') || 0);
                  return parsed as 0;
                }}
              />
            </Form.Item>

            <Form.Item
              name="area"
              label="Площадь (м²)"
              style={{ marginBottom: 16 }}
            >
              <InputNumber
                placeholder="Площадь"
                size="large"
                style={{ width: 140 }}
                min={0}
              />
            </Form.Item>

            <Form.Item
              name="rooms"
              label="Количество комнат"
              style={{ marginBottom: 16 }}
            >
              <InputNumber
                placeholder="Комнаты"
                size="large"
                style={{ width: 140 }}
                min={0}
                max={50}
              />
            </Form.Item>
          </Space>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setEditPropertyModalVisible(false);
                  setEditingProperty(null);
                  propertyForm.resetFields();
                }}
              >
                Отмена
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={editPropertyLoading}
              >
                Сохранить
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MyObjectsPage;
