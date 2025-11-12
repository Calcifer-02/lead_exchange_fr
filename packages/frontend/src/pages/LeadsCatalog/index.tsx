import { Card, Input, Button, Empty, Space } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';

const LeadsCatalogPage = () => {
  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24, fontWeight: 600 }}>Каталог лидов</h1>

      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Input
            placeholder="Поиск лидов..."
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
          />
          <Button icon={<FilterOutlined />}>Фильтры</Button>
        </Space>
      </Card>

      <Card>
        <Empty description="Здесь будет каталог доступных лидов" />
      </Card>
    </div>
  );
};

export default LeadsCatalogPage;

