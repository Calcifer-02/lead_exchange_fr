import { Card, Tabs, Empty } from 'antd';

const DealsPage = () => {
  const items = [
    {
      key: 'active',
      label: 'Активные',
      children: <Empty description="Активные сделки отсутствуют" />,
    },
    {
      key: 'completed',
      label: 'Завершенные',
      children: <Empty description="Завершенные сделки отсутствуют" />,
    },
    {
      key: 'cancelled',
      label: 'Отмененные',
      children: <Empty description="Отмененные сделки отсутствуют" />,
    },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24, fontWeight: 600 }}>Сделки</h1>

      <Card>
        <Tabs items={items} />
      </Card>
    </div>
  );
};

export default DealsPage;

