import { Avatar, Badge, Button, Input, Space, Tooltip } from 'antd';
import { BellOutlined, MessageOutlined, MenuOutlined, SearchOutlined } from '@ant-design/icons';
import styles from './styles.module.css';

interface AppHeaderProps {
  onToggleSidebar?: () => void;
  showMenuTrigger?: boolean;
}

const AppHeader = ({ onToggleSidebar, showMenuTrigger = false }: AppHeaderProps) => (
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

    <div className={styles.searchWrapper}>
      <Input
        allowClear
        placeholder="Поиск по объектам, лидам, коллегам..."
        prefix={<SearchOutlined style={{ color: '#4567A1' }} />}
      />
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

export default AppHeader;

