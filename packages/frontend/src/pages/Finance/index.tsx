import { Card, Row, Col, Statistic, Empty } from 'antd';
// import type { ColumnsType } from 'antd/es/table';

// interface Transaction {
//   key: string;
//   date: string;
//   description: string;
//   amount: number;
//   status: string;
// }

// const columns: ColumnsType<Transaction> = [
//   {
//     title: 'Дата',
//     dataIndex: 'date',
//     key: 'date',
//   },
//   {
//     title: 'Описание',
//     dataIndex: 'description',
//     key: 'description',
//   },
//   {
//     title: 'Сумма',
//     dataIndex: 'amount',
//     key: 'amount',
//     render: (amount: number) => `${amount.toLocaleString('ru-RU')} ₽`,
//   },
//   {
//     title: 'Статус',
//     dataIndex: 'status',
//     key: 'status',
//   },
// ];

const FinancePage = () => {
  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24, fontWeight: 600 }}>Финансы</h1>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Общий баланс"
              value={125000}
              precision={2}
              suffix="₽"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Доход за месяц"
              value={452000}
              precision={2}
              suffix="₽"
              valueStyle={{ color: '#1F71FF' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Расходы за месяц"
              value={89000}
              precision={2}
              suffix="₽"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="История транзакций">
        <Empty description="Транзакции отсутствуют" />
      </Card>
    </div>
  );
};

export default FinancePage;

